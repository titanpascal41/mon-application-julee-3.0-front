export const calculerCapaciteReelle = (hJDEV, hJTIV, capaciteTheorique) => {
  // Capacité réelle = Somme des H/J réellement consommés
  const capaciteReelle = hJDEV + hJTIV;
  
  // La capacité réelle ne peut pas dépasser la capacité théorique
  const capaciteReelleLimitee = Math.min(capaciteReelle, capaciteTheorique);
  
  return {
    capaciteReelle: capaciteReelleLimitee,
    capaciteReelleBrute: capaciteReelle,
    depassement: capaciteReelle > capaciteTheorique
  };
};

export const evaluerPerformance = (livraison, engagement) => {
  if (livraison < engagement) {
    return {
      type: 'sous-performance',
      message: 'Sous-performance: Le travail livré est inférieur au travail engagé',
      ecart: engagement - livraison,
      pourcentage: engagement > 0 ? ((livraison / engagement) * 100).toFixed(2) : 0
    };
  } else if (livraison > engagement) {
    return {
      type: 'surcharge',
      message: 'Surcharge: Le travail livré dépasse le travail engagé',
      ecart: livraison - engagement,
      pourcentage: engagement > 0 ? ((livraison / engagement) * 100).toFixed(2) : 0
    };
  } else {
    return {
      type: 'normal',
      message: 'Performance normale: Le travail livré correspond au travail engagé',
      ecart: 0,
      pourcentage: 100
    };
  }
};


