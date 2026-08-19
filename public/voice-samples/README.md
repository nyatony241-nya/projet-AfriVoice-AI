# Voice Samples — AfriVoice

Ce dossier contient les fichiers audio de preview pour chaque voix du Voice Registry.

## Convention de nommage

Chaque fichier DOIT correspondre exactement au `voiceId` du registre :

```
{COUNTRY_CODE}_{PERSONA}_{NUMBER}.mp3
```

### Exemples :
- `NG_BLESSING_01.mp3` — Blessing (Nigeria, Natural)
- `NG_NGOZI_02.mp3` — Ngozi (Nigeria, Dynamic)
- `NG_EMEKA_03.mp3` — Emeka (Nigeria, Premium)
- `SN_FATOU_01.mp3` — Fatou (Sénégal, Natural)
- `CI_AMINATA_01.mp3` — Aminata (Côte d'Ivoire, Natural)

## Comment générer les samples

Chaque sample doit être généré **une seule fois** avec :
1. Le **même `providerVoiceId`** que la voix de production (ex: `Aoede`, `Puck`)
2. Les **mêmes paramètres vocaux** (variant, personality, contentStyle)
3. Un texte court standard (ex: "Bonjour, je suis Fatou du Sénégal. Bienvenue sur AfriVoice.")
4. Durée : 5-10 secondes maximum
5. Format : MP3, 128kbps minimum

## Liste complète (60 voix)

### Starter (5 pays × 1 voix = 5 voix Natural)
- `NG_BLESSING_01.mp3`
- `CI_AMINATA_01.mp3`
- `CM_CHANTAL_01.mp3`
- `SN_FATOU_01.mp3`
- `CG_GRACE_01.mp3`

### Creator (10 pays × 2 voix = 20 voix Natural + Dynamic)
*Starter voices +*
- `GH_AKUA_01.mp3`, `GH_ABENA_02.mp3`
- `MA_LEILA_01.mp3`, `MA_YASMINE_02.mp3`
- `ZA_NALEDI_01.mp3`, `ZA_THANDI_02.mp3`
- `KE_WANJIRU_01.mp3`, `KE_AISHA_02.mp3`
- `GA_SYLVIE_01.mp3`, `GA_ORNELLA_02.mp3`
- *(+ Dynamic voices for Starter countries)*

### Pro (20 pays × 3 voix = 60 voix complètes)
*Creator voices + tous les Premium (male) + pays restants*

## Important

- **NE JAMAIS** supprimer ou renommer un fichier existant
- **NE JAMAIS** régénérer un sample existant (immutabilité)
- Si un sample n'existe pas, le bouton "Écouter" affichera "Bientôt"
