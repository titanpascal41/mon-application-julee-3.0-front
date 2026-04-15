// Gestion des délais du plan de charge via l'API
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

// Fonction pour calculer les heures ouvrées entre deux dates
const calculerHeuresOuvre = (dateDebut, dateFin) => {
  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);

  if (fin < debut) return 0;

  let heuresOuvre = 0;
  const courant = new Date(debut);

  while (courant <= fin) {
    // Vérifier si c'est un jour ouvré (lundi à vendredi)
    const jourSemaine = courant.getDay(); // 0 = dimanche, 6 = samedi
    if (jourSemaine >= 1 && jourSemaine <= 5) { // Lundi à vendredi
      // Vérifier si c'est dans les heures ouvrées (9h-17h)
      const heure = courant.getHours();
      if (heure >= 9 && heure < 17) {
        heuresOuvre += 1;
      }
    }
    courant.setHours(courant.getHours() + 1);
  }

  return heuresOuvre;
};

// Charger tous les délais depuis l'API
export const chargerDelais = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/delais`);
    if (!response.ok) {
      throw new Error("Erreur lors du chargement des délais");
    }
    const delais = await response.json();
    return delais;
  } catch (error) {
    console.error("Erreur lors du chargement des délais:", error);
    return [];
  }
};

// Créer un nouveau suivi de délai
export const creerDelai = async (delaiData) => {
  // Validation des données
  if (!delaiData.dateValidationSI) {
    return { succes: false, message: "La date de validation SI est obligatoire." };
  }

  // Créer le nouveau délai
  const nouveauDelai = {
    dateValidationSI: delaiData.dateValidationSI,
    dateReponseDEV: delaiData.dateReponseDEV || null,
    dateReponseTIV: delaiData.dateReponseTIV || null,
    delaiDEV: 0,
    delaiTIV: 0,
    respectDelaiDEV: false,
    respectDelaiTIV: false,
    rappelEnvoyeDEV: false,
    rappelEnvoyeTIV: false,
    notificationVue: false
  };

  // Calculer les délais si les dates de réponse sont fournies
  if (nouveauDelai.dateReponseDEV) {
    nouveauDelai.delaiDEV = calculerHeuresOuvre(nouveauDelai.dateValidationSI, nouveauDelai.dateReponseDEV);
    nouveauDelai.respectDelaiDEV = nouveauDelai.delaiDEV <= 48;
  }

  if (nouveauDelai.dateReponseTIV) {
    nouveauDelai.delaiTIV = calculerHeuresOuvre(nouveauDelai.dateValidationSI, nouveauDelai.dateReponseTIV);
    nouveauDelai.respectDelaiTIV = nouveauDelai.delaiTIV <= 48;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/delais`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nouveauDelai),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la création du délai");
    }

    const delaiCree = await response.json();
    return { succes: true, message: "Suivi de délai créé avec succès.", delai: delaiCree };
  } catch (error) {
    console.error("Erreur lors de la création du délai:", error);
    return { succes: false, message: "Erreur lors de la création du suivi de délai" };
  }
};

// Mettre à jour un délai existant
export const mettreAJourDelai = async (id, delaiData) => {
  // Validation des données
  if (!delaiData.dateValidationSI) {
    return { succes: false, message: "La date de validation SI est obligatoire." };
  }

  // Récupérer le délai existant
  const delais = await chargerDelais();
  const delaiExistant = delais.find(d => d.id === id);

  if (!delaiExistant) {
    return { succes: false, message: "Suivi de délai introuvable." };
  }

  // Mettre à jour le délai
  const delaiMisAJour = {
    ...delaiExistant,
    dateValidationSI: delaiData.dateValidationSI,
    dateReponseDEV: delaiData.dateReponseDEV || null,
    dateReponseTIV: delaiData.dateReponseTIV || null
  };

  // Recalculer les délais
  if (delaiMisAJour.dateReponseDEV) {
    delaiMisAJour.delaiDEV = calculerHeuresOuvre(delaiMisAJour.dateValidationSI, delaiMisAJour.dateReponseDEV);
    delaiMisAJour.respectDelaiDEV = delaiMisAJour.delaiDEV <= 48;

    // Générer un rappel si délai dépassé et pas encore envoyé
    if (!delaiMisAJour.respectDelaiDEV && !delaiMisAJour.rappelEnvoyeDEV) {
      console.log("RAPPEL: Délai DEV dépassé pour le suivi ID:", id);
      delaiMisAJour.rappelEnvoyeDEV = true;
    }
  }

  if (delaiMisAJour.dateReponseTIV) {
    delaiMisAJour.delaiTIV = calculerHeuresOuvre(delaiMisAJour.dateValidationSI, delaiMisAJour.dateReponseTIV);
    delaiMisAJour.respectDelaiTIV = delaiMisAJour.delaiTIV <= 48;

    // Générer un rappel si délai dépassé et pas encore envoyé
    if (!delaiMisAJour.respectDelaiTIV && !delaiMisAJour.rappelEnvoyeTIV) {
      console.log("RAPPEL: Délai TIV dépassé pour le suivi ID:", id);
      delaiMisAJour.rappelEnvoyeTIV = true;
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/delais/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(delaiMisAJour),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "Suivi de délai introuvable." };
      }
      throw new Error("Erreur lors de la mise à jour du délai");
    }

    const delaiUpdate = await response.json();
    return { succes: true, message: "Suivi de délai mis à jour avec succès.", delai: delaiUpdate };
  } catch (error) {
    console.error("Erreur lors de la mise à jour du délai:", error);
    return { succes: false, message: "Erreur lors de la mise à jour du suivi de délai" };
  }
};

// Supprimer un délai
export const supprimerDelai = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/delais/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "Suivi de délai introuvable." };
      }
      throw new Error("Erreur lors de la suppression du délai");
    }

    return { succes: true, message: "Suivi de délai supprimé avec succès." };
  } catch (error) {
    console.error("Erreur lors de la suppression du délai:", error);
    return { succes: false, message: "Erreur lors de la suppression du suivi de délai" };
  }
};

// Marquer une notification comme vue
export const marquerNotificationVue = async (id) => {
  const delais = await chargerDelais();
  const delai = delais.find(d => d.id === id);

  if (!delai) {
    return { succes: false, message: "Délai introuvable." };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/delais/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...delai, notificationVue: true }),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la mise à jour de la notification");
    }

    return { succes: true, message: "Notification marquée comme vue." };
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la notification:", error);
    return { succes: false, message: "Erreur lors de la mise à jour de la notification" };
  }
};

// Obtenir les délais en retard (non vus en notification)
export const getDelaisEnRetard = async () => {
  const delais = await chargerDelais();
  const maintenant = new Date();

  return delais.filter(delai => {
    // Ne pas afficher les notifications déjà vues
    if (delai.notificationVue) return false;

    let estEnRetard = false;

    // Vérifier DEV
    if (delai.dateReponseDEV) {
      const delaiDEV = calculerHeuresOuvre(delai.dateValidationSI, maintenant.toISOString());
      if (delaiDEV > 48 && !delai.respectDelaiDEV) estEnRetard = true;
    } else {
      const delaiDEV = calculerHeuresOuvre(delai.dateValidationSI, maintenant.toISOString());
      if (delaiDEV > 48) estEnRetard = true;
    }

    // Vérifier TIV
    if (delai.dateReponseTIV) {
      const delaiTIV = calculerHeuresOuvre(delai.dateValidationSI, maintenant.toISOString());
      if (delaiTIV > 48 && !delai.respectDelaiTIV) estEnRetard = true;
    } else {
      const delaiTIV = calculerHeuresOuvre(delai.dateValidationSI, maintenant.toISOString());
      if (delaiTIV > 48) estEnRetard = true;
    }

    return estEnRetard;
  });
};

// Obtenir tous les délais en retard (même ceux déjà vus)
export const getTousDelaisEnRetard = async () => {
  const delais = await chargerDelais();
  const maintenant = new Date();

  return delais.filter(delai => {
    let estEnRetard = false;

    // Vérifier DEV
    if (delai.dateReponseDEV) {
      const delaiDEV = calculerHeuresOuvre(delai.dateValidationSI, maintenant.toISOString());
      if (delaiDEV > 48 && !delai.respectDelaiDEV) estEnRetard = true;
    } else {
      const delaiDEV = calculerHeuresOuvre(delai.dateValidationSI, maintenant.toISOString());
      if (delaiDEV > 48) estEnRetard = true;
    }

    // Vérifier TIV
    if (delai.dateReponseTIV) {
      const delaiTIV = calculerHeuresOuvre(delai.dateValidationSI, maintenant.toISOString());
      if (delaiTIV > 48 && !delai.respectDelaiTIV) estEnRetard = true;
    } else {
      const delaiTIV = calculerHeuresOuvre(delai.dateValidationSI, maintenant.toISOString());
      if (delaiTIV > 48) estEnRetard = true;
    }

    return estEnRetard;
  });
};
