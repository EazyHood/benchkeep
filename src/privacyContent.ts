// Keep this bundled copy aligned with public/privacy.html when revising the policy.
export const privacyContent = {
  "updated": "23 September 2026",
  "intro": "Benchkeep saves the photo, the spot and the next move in a craft project. This notice explains what stays on your device and what purchase services process.",
  "summary": "Your craft photos and notes are stored locally. Benchkeep does not upload them to RevenueCat or a project cloud. When purchase services are enabled, those services process separate identifiers and purchase information. A Benchkeep account is not required.",
  "sections": [
    {
      "id": "who",
      "title": "Who is responsible",
      "paragraphs": [
        "Benchkeep is provided by Jhonatan Del Rio Mejia, an independent developer in Colombia. For questions about this notice or requests concerning your information, email jhonatandelrio9@gmail.com."
      ]
    },
    {
      "id": "local",
      "title": "The information in your bench",
      "paragraphs": [
        "The app saves photos you choose or capture, project titles, your next-move and detail notes, points you place on photos, project status, dates, local record identifiers and unfinished drafts. These records let you reopen a piece, see its previous checkpoints and continue working.",
        "On mobile, project records and photo copies are kept in the app's local storage. In the web preview, they are kept in your browser's storage. Newly selected images are converted to JPEG and resized when needed. Benchkeep does not run image recognition or send your work to an AI service. Bundled example content is separate from your work.",
        "Local records include a previous readable state for recovery. Discarded drafts and replaced imports can leave unused photo copies in local storage. Finishing a piece archives it; it does not delete it."
      ]
    },
    {
      "id": "purchases",
      "title": "Purchase information",
      "paragraphs": [
        "When configured in an installed app, RevenueCat and the applicable app store support the optional Full bench purchase. They process purchase and receipt records, an anonymous customer identifier, entitlement status and technical context such as device type, platform, app or operating-system version, locale and service timestamps. This supports purchase validation, access restoration and purchase reporting. Services may contact their servers when the app opens, not only when you tap Buy.",
        "When a Galaxy Store build enables purchasing, it uses Samsung's purchase services, which also process device or other identifiers. The app does not send your project photos, titles or notes to these purchase services. Benchkeep's own interface does not request payment-card numbers; payment details are handled by the store's checkout.",
        "The public web preview has purchasing disabled. Development builds may use a clearly labeled RevenueCat Test Store; test records are still processed by that service even though there is no real charge.",
        "Read more about RevenueCat's processing and Samsung's privacy practices. Their services may process information outside your country. Benchkeep does not configure advertising or sell your craft content."
      ]
    },
    {
      "id": "choices",
      "title": "Permissions and choices",
      "paragraphs": [
        "Camera: optional, to photograph your piece after you select the camera action. You can deny access and choose an existing photo instead.",
        "Photos and files: to read the picture or backup you choose. Access requirements depend on your device and operating-system version.",
        "Internet: to communicate with configured purchase services. The craft records described above remain local.",
        "You can manage permissions in your device settings. Benchkeep has no feature that records microphone audio, reads contacts or tracks your location."
      ]
    },
    {
      "id": "backups",
      "title": "Backups and sharing",
      "paragraphs": [
        "Export notes creates a text record without photos. A full backup includes your photos, points, notes, project records and draft in a portable JSON file. The built-in example is excluded. You choose where to save or share an export; the selected service or recipient can then receive its contents.",
        "Benchkeep does not encrypt exported files. Protect them according to what they contain. Mobile exports and imported files can also leave temporary copies in the app cache until that cache is cleared. Importing replaces the visible bench after confirmation; it is not a secure deletion of previous local files and does not restore purchases."
      ]
    },
    {
      "id": "retention",
      "title": "Retention and deletion",
      "paragraphs": [
        "Your local craft data stays on that installation until you clear its storage or remove the app. On Android, use the system's app-storage controls to clear Benchkeep data; in the web preview, clear the site's browser data. Uninstalling or clearing storage can permanently remove local work. Keep an export first if you want to retain it.",
        "Delete downloaded or shared backups separately from every place you saved them. Benchkeep cannot erase a file already sent to another person or service, or recover local work that was never shared with us.",
        "Uninstalling does not automatically erase RevenueCat or store purchase records. These records can be kept to provide and restore the unlock, handle support, resolve disputes and meet applicable retention obligations. To request access, correction or deletion of information processed for Benchkeep, use the contact above. We may need a purchase reference or other limited information to locate the right record; do not send passwords or full payment-card details. Deletion of purchase information may affect restoration of access and does not itself issue a refund."
      ]
    },
    {
      "id": "contact",
      "title": "Support and website access",
      "paragraphs": [
        "If you email us, we receive your email address, message and the attachments you choose to include. We use that information to respond and handle the request, retaining it as needed for that purpose and related obligations. You can also request deletion of support correspondence.",
        "Loading a hosted preview or this notice sends ordinary connection information to the web hosting provider so it can deliver the page. This notice contains no analytics scripts, external fonts or advertising widgets. The browser's local craft storage is separate from those page requests."
      ]
    },
    {
      "id": "security",
      "title": "Security and your rights",
      "paragraphs": [
        "Local app storage uses the protections available on your device; Benchkeep does not add its own encryption layer to project records or exports. Protect your device and backup destinations. RevenueCat documents encryption in transit for its purchase-service data. No service or device can promise absolute security.",
        "Depending on applicable law, you may have rights to access, correct, export, delete or restrict processing of your information, object to certain processing, withdraw consent, or contact a data-protection authority. Contact us to make a request. Local export and storage controls are available without giving us your photos or notes."
      ]
    },
    {
      "id": "updates",
      "title": "Updates to this notice",
      "paragraphs": [
        "We will date revisions on this page and describe material changes in app update notes. Where a change requires additional notice or consent, we will provide it before the changed processing begins."
      ]
    }
  ]
} as const;
