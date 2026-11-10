# Radar Maison — version gratuite

Application web progressive (PWA) pour iPhone, avec tableau d'affichage vintage.

## Fonctionnement
- `adsb.lol` : positions ADS-B en direct, sans clé API.
- `adsbdb` : recherche de routes à partir de l'indicatif (origine/destination quand connues).
- Rayon filtré à 5 km et altitude strictement inférieure à 5 000 pi.
- Actualisation de l'interface toutes les 5 secondes.
- Détails du vol : type, immatriculation, vitesse, origine et destination.

## Limites importantes
- Les services sont communautaires/gratuits et peuvent changer, ralentir ou être indisponibles.
- Origine et destination ne sont pas garanties : elles s'affichent « Inconnue » si l'indicatif n'est pas répertorié ou ne permet pas de correspondance.
- L'ADS-B ne détecte pas tous les avions. Les aéronefs sans émission ADS-B, certains vols masqués ou non reçus par les stations au sol peuvent manquer.
- Les 5 secondes correspondent au rafraîchissement de l'application, pas à une garantie que les données sources changent à chaque rafraîchissement.
- Une recherche d'itinéraire est mise en cache pendant 6 heures pour limiter les appels.
- L'API adsb.lol indique que les conditions et limites peuvent évoluer; pour une utilisation publique/production, vérifier ses conditions et contacter le projet.
- Aucune donnée d'exemple n'est présentée comme un vol réel.

## Démarrage local
Node.js 18 ou plus récent :
```bash
npm install
npm start
```
Puis ouvrir `http://localhost:3000`.

La géolocalisation iPhone exige HTTPS (sauf localhost). Pour l'utiliser sur iPhone à la maison, déployer ce projet sur un hébergement Node.js avec HTTPS.

## Ajouter à l'écran d'accueil iPhone
1. Ouvrir l'adresse HTTPS dans Safari.
2. Autoriser la localisation « Lorsque l'app est active ».
3. Partager → Sur l'écran d'accueil.

## Confidentialité
Les coordonnées GPS sont envoyées au serveur de cette application pour demander les avions autour de vous. Ne publiez pas ce projet avec des clés privées (aucune clé n'est requise dans cette version).
