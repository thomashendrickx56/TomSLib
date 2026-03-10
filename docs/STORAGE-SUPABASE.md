# Stockage des fichiers (alternative à Google Drive)

## Option 1 : Supabase Storage (intégré)

- **Gratuit** : 1 Go de stockage (plan gratuit Supabase).
- Aucun autre service à créer : tout reste dans ton projet Supabase.

### Créer le bucket

1. Ouvre ton projet sur [app.supabase.com](https://app.supabase.com).
2. Va dans **Storage** (menu de gauche).
3. Clique sur **New bucket**.
4. Nom : `media`.
5. Coche **Public bucket** (pour que les liens de lecture fonctionnent).
6. Valide avec **Create bucket**.

Ensuite, dans l’onglet Admin de TomSLib, choisis **« Uploader un fichier »** et envoie ton PDF/vidéo : il sera stocké dans ce bucket et le lien sera enregistré automatiquement.

---

## Option 2 : Lien externe

Si tu préfères héberger ailleurs (Mega, autre cloud, ton propre serveur) :

- Dans le formulaire Admin, choisis **« Lien externe »**.
- Colle l’URL du fichier (lien de téléchargement ou de lecture).
- La page de détail affichera un bouton **« Ouvrir le fichier »** qui ouvre ce lien dans un nouvel onglet.

Pour une lecture directe dans la page (iframe), le lien doit pointer vers un fichier que le navigateur peut afficher (PDF, MP4, etc.). Les liens Mega ouvrent généralement la page Mega dans un nouvel onglet.

---

## Besoin de plus de 1 Go ?

- Passe au **plan Pro Supabase** pour plus de stockage.
- Ou utilise **Cloudflare R2** (10 Go gratuit, pas de coût de bande passante) : on peut ajouter plus tard une option d’upload vers R2 si tu le souhaites.
