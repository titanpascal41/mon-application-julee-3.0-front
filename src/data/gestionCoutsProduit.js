// Gestion des coûts du produit via l'API
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

// Fonction pour calculer tous les coûts automatiquement
const calculerCouts = (coutData) => {
  const coutPrevuDEV = (coutData.chargePrevisionnelleDEV || 0) * (coutData.tjmDEV || 0);
  const coutReelDEV = (coutData.chargeEffectiveDEV || 0) * (coutData.tjmDEV || 0);
  const coutPrevuTIV = (coutData.chargePrevisionnelleTIV || 0) * (coutData.tjmTIV || 0);
  const coutReelTIV = (coutData.chargeEffectiveTIV || 0) * (coutData.tjmTIV || 0);
  const coutReelTotal = coutReelDEV + coutReelTIV;
  const coutPrevuTotal = coutPrevuDEV + coutPrevuTIV;
  const ecart = coutReelTotal - coutPrevuTotal;

  return {
    coutPrevuDEV: parseFloat(coutPrevuDEV.toFixed(2)),
    coutReelDEV: parseFloat(coutReelDEV.toFixed(2)),
    coutPrevuTIV: parseFloat(coutPrevuTIV.toFixed(2)),
    coutReelTIV: parseFloat(coutReelTIV.toFixed(2)),
    coutReelTotal: parseFloat(coutReelTotal.toFixed(2)),
    netAPayer: parseFloat(coutReelTotal.toFixed(2)),
    ecart: parseFloat(ecart.toFixed(2))
  };
};

// Fonction pour migrer et recalculer les coûts existants si nécessaire
const migrerEtRecalculerCouts = (couts) => {
  return couts.map(cout => {
    // Vérifier si les propriétés calculées manquent
    if (cout.coutPrevuDEV === undefined || cout.coutReelDEV === undefined || 
        cout.coutPrevuTIV === undefined || cout.coutReelTIV === undefined ||
        cout.coutReelTotal === undefined || cout.netAPayer === undefined || cout.ecart === undefined) {
      // Recalculer les coûts
      const calculs = calculerCouts(cout);
      return { ...cout, ...calculs };
    }
    return cout;
  });
};

// Charger tous les coûts depuis l'API
export const chargerCouts = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/couts`);
    if (!response.ok) {
      throw new Error("Erreur lors du chargement des coûts");
    }
    const couts = await response.json();
    return migrerEtRecalculerCouts(couts);
  } catch (error) {
    console.error("Erreur lors du chargement des coûts:", error);
    return [];
  }
};

// Créer un nouveau suivi de coût
export const creerCout = async (coutData) => {
  // Créer le nouveau coût avec calculs automatiques
  const calculs = calculerCouts(coutData);
  const nouveauCout = {
    chargePrevisionnelleDEV: parseFloat(coutData.chargePrevisionnelleDEV || 0),
    chargeEffectiveDEV: parseFloat(coutData.chargeEffectiveDEV || 0),
    tjmDEV: parseFloat(coutData.tjmDEV || 0),
    chargePrevisionnelleTIV: parseFloat(coutData.chargePrevisionnelleTIV || 0),
    chargeEffectiveTIV: parseFloat(coutData.chargeEffectiveTIV || 0),
    tjmTIV: parseFloat(coutData.tjmTIV || 0),
    ...calculs
  };

  try {
    const response = await fetch(`${API_BASE_URL}/couts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nouveauCout),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la création du coût");
    }

    const coutCree = await response.json();
    return { succes: true, message: "Suivi de coût créé avec succès.", cout: coutCree };
  } catch (error) {
    console.error("Erreur lors de la création du coût:", error);
    return { succes: false, message: "Erreur lors de la création du suivi de coût" };
  }
};

// Mettre à jour un coût existant
export const mettreAJourCout = async (id, coutData) => {
  // Récupérer le coût existant
  const couts = await chargerCouts();
  const coutExistant = couts.find(c => c.id === id);

  if (!coutExistant) {
    return { succes: false, message: "Suivi de coût introuvable." };
  }

  // Mettre à jour et recalculer
  const coutMisAJour = {
    chargePrevisionnelleDEV: parseFloat(coutData.chargePrevisionnelleDEV !== undefined ? coutData.chargePrevisionnelleDEV : coutExistant.chargePrevisionnelleDEV),
    chargeEffectiveDEV: parseFloat(coutData.chargeEffectiveDEV !== undefined ? coutData.chargeEffectiveDEV : coutExistant.chargeEffectiveDEV),
    tjmDEV: parseFloat(coutData.tjmDEV !== undefined ? coutData.tjmDEV : coutExistant.tjmDEV),
    chargePrevisionnelleTIV: parseFloat(coutData.chargePrevisionnelleTIV !== undefined ? coutData.chargePrevisionnelleTIV : coutExistant.chargePrevisionnelleTIV),
    chargeEffectiveTIV: parseFloat(coutData.chargeEffectiveTIV !== undefined ? coutData.chargeEffectiveTIV : coutExistant.chargeEffectiveTIV),
    tjmTIV: parseFloat(coutData.tjmTIV !== undefined ? coutData.tjmTIV : coutExistant.tjmTIV)
  };

  // Recalculer tous les coûts
  const calculs = calculerCouts(coutMisAJour);
  const coutFinal = { ...coutMisAJour, ...calculs };

  try {
    const response = await fetch(`${API_BASE_URL}/couts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(coutFinal),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "Suivi de coût introuvable." };
      }
      throw new Error("Erreur lors de la mise à jour du coût");
    }

    const coutUpdate = await response.json();
    return { succes: true, message: "Suivi de coût mis à jour avec succès.", cout: coutUpdate };
  } catch (error) {
    console.error("Erreur lors de la mise à jour du coût:", error);
    return { succes: false, message: "Erreur lors de la mise à jour du suivi de coût" };
  }
};

// Supprimer un coût
export const supprimerCout = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/couts/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "Suivi de coût introuvable." };
      }
      throw new Error("Erreur lors de la suppression du coût");
    }

    return { succes: true, message: "Suivi de coût supprimé avec succès." };
  } catch (error) {
    console.error("Erreur lors de la suppression du coût:", error);
    return { succes: false, message: "Erreur lors de la suppression du suivi de coût" };
  }
};

// Obtenir les statistiques générales
export const getStatistiquesCouts = async () => {
  const couts = await chargerCouts();

  if (couts.length === 0) {
    return {
      totalProjets: 0,
      coutTotalPrevu: 0,
      coutTotalReel: 0,
      ecartTotal: 0,
      projetsEnDeficit: 0,
      projetsEnBenefice: 0
    };
  }

  const totalPrevu = couts.reduce((sum, c) => sum + ((c.coutPrevuDEV || 0) + (c.coutPrevuTIV || 0)), 0);
  const totalReel = couts.reduce((sum, c) => sum + (c.coutReelTotal || 0), 0);
  const ecartTotal = couts.reduce((sum, c) => sum + (c.ecart || 0), 0);

  const projetsEnDeficit = couts.filter(c => (c.ecart || 0) > 0).length;
  const projetsEnBenefice = couts.filter(c => (c.ecart || 0) < 0).length;

  return {
    totalProjets: couts.length,
    coutTotalPrevu: parseFloat(totalPrevu.toFixed(2)),
    coutTotalReel: parseFloat(totalReel.toFixed(2)),
    ecartTotal: parseFloat(ecartTotal.toFixed(2)),
    projetsEnDeficit,
    projetsEnBenefice
  };
};

// Obtenir les coûts avec écart positif (dépassement)
export const getCoutsEnDeficit = async () => {
  const couts = await chargerCouts();
  return couts.filter(c => (c.ecart || 0) > 0).sort((a, b) => (b.ecart || 0) - (a.ecart || 0));
};

// Obtenir les coûts avec écart négatif (économie)
export const getCoutsEnBenefice = async () => {
  const couts = await chargerCouts();
  return couts.filter(c => (c.ecart || 0) < 0).sort((a, b) => (a.ecart || 0) - (b.ecart || 0));
};
