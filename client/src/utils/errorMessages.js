// ============================================
// Lakhlifi Gym — Utilitaire de gestion d'erreurs
// Transforme les erreurs techniques en messages
// français clairs pour l'utilisateur final.
// ============================================

/**
 * Convertit une erreur axios en message français lisible.
 * @param {Error} err - L'erreur interceptée
 * @param {string} fallback - Message de secours si aucun cas ne correspond
 * @returns {string} - Message d'erreur en français
 */
export function getErrorMessage(err, fallback = 'Une erreur inattendue s\'est produite. Veuillez réessayer.') {
  // 1. Si le serveur a renvoyé un message ou une erreur explicite, on le prend en priorité
  const serverMsg = err?.response?.data?.error || err?.response?.data?.message;

  if (serverMsg) {
    // Éviter d'afficher les erreurs techniques brutes
    if (isTechnicalError(serverMsg)) return fallback;
    return serverMsg;
  }

  // 2. Gestion par code HTTP
  const status = err?.response?.status;
  switch (status) {
    case 400: return 'Les données saisies sont invalides. Vérifiez les champs et réessayez.';
    case 401: return 'Session expirée. Veuillez vous reconnecter.';
    case 403: return 'Vous n\'avez pas l\'autorisation d\'effectuer cette action.';
    case 404: return 'L\'élément demandé est introuvable.';
    case 409: return 'Cette donnée est déjà utilisée. Vérifiez les champs en double (téléphone, ID).';
    case 429: return 'Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.';
    case 500: return 'Erreur serveur interne. L\'équipe technique a été informée.';
    case 503: return 'Le service est temporairement indisponible. Réessayez dans quelques instants.';
  }

  // 3. Erreurs réseau
  if (!err?.response) {
    return 'Impossible de contacter le serveur. Vérifiez votre connexion Internet.';
  }

  return fallback;
}

/**
 * Détecte si un message est une erreur technique qui ne devrait pas être affichée.
 */
function isTechnicalError(msg) {
  const technicalKeywords = [
    'syntax error', 'duplicate key', 'violates', 'constraint', 
    'undefined', 'null', 'stack', 'at Object', 'ECONNREFUSED',
    'invalid input syntax', 'relation', 'column', 'operator'
  ];
  const lower = msg.toLowerCase();
  return technicalKeywords.some(kw => lower.includes(kw));
}

/**
 * Messages d'erreur spécifiques par contexte.
 */
export const ERROR_MESSAGES = {
  // Membres
  MEMBER_CREATE_FAIL:     'Impossible d\'ajouter ce membre. Vérifiez que tous les champs sont correctement remplis.',
  MEMBER_UPDATE_FAIL:     'La modification du membre a échoué. Réessayez.',
  MEMBER_DELETE_FAIL:     'La suppression du membre a échoué. Réessayez.',
  MEMBER_DUPLICATE_PHONE: 'Ce numéro de téléphone est déjà utilisé par un autre membre.',
  MEMBER_DUPLICATE_ID:    'Cet ID Unique (Badge) est déjà attribué à un autre membre.',
  MEMBER_DUPLICATE_NAME:  'Un membre avec ce prénom et ce nom existe déjà dans cette salle.',
  MEMBER_PHONE_INVALID:   'Le numéro de téléphone est invalide. Il doit commencer par +212.',
  
  // Paiements
  PAYMENT_CREATE_FAIL:    'L\'enregistrement du paiement a échoué. Vérifiez que le membre et le plan sont bien sélectionnés.',
  PAYMENT_NO_MEMBER:      'Veuillez sélectionner un membre avant de valider le paiement.',
  PAYMENT_NO_PLAN:        'Veuillez sélectionner un plan d\'abonnement.',
  PAYMENT_AMOUNT_INVALID: 'Le montant saisi est invalide.',

  // Salles
  GYM_CREATE_FAIL:        'L\'ajout de la salle a échoué. Vérifiez que le nom est unique.',
  GYM_UPDATE_FAIL:        'La modification de la salle a échoué. Réessayez.',
  GYM_DELETE_FAIL:        'La suppression de la salle a échoué. Il existe peut-être des membres actifs dans cette salle.',
  GYM_DUPLICATE_NAME:     'Une salle avec ce nom existe déjà.',

  // Abonnements
  SUB_CREATE_FAIL:        'L\'ajout de l\'offre a échoué. Vérifiez que le nom, le prix et la durée sont valides.',
  SUB_UPDATE_FAIL:        'La modification de l\'offre a échoué. Réessayez.',
  SUB_PRICE_INVALID:      'Le prix saisi est invalide. Il doit être un nombre positif.',
  SUB_DAYS_INVALID:       'La durée saisie est invalide. Elle doit être un nombre de jours positif.',

  // Personnel
  STAFF_CREATE_FAIL:      'La création du compte employé a échoué. Ce nom d\'utilisateur est peut-être déjà pris.',
  STAFF_UPDATE_FAIL:      'La modification de l\'employé a échoué. Réessayez.',
  STAFF_DUPLICATE_USER:   'Ce nom d\'utilisateur est déjà utilisé. Choisissez-en un autre.',
  STAFF_PASSWORD_SHORT:   'Le mot de passe doit contenir au moins 6 caractères.',

  // Connexion
  LOGIN_INVALID:          'Nom d\'utilisateur ou mot de passe incorrect.',
  LOGIN_RATE_LIMIT:       'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
  LOGIN_DISABLED:         'Ce compte a été désactivé. Contactez l\'administrateur.',

  // WhatsApp
  WA_SEND_FAIL:           'L\'ajout à la file d\'envoi WhatsApp a échoué. Réessayez.',
  WA_NO_PHONE:            'Ce membre n\'a pas de numéro de téléphone enregistré.',
};
