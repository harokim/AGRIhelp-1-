# AGRIhelp

Web-based document management and online appointment prototype for the Municipal Agricultural and Biosystems Engineering Office.

## Updated prototype features
- AGRIhelp branding with the Municipal Agricultural and Biosystems Engineering Office name on login and sidebar.
- Engineer account creation and client account creation.
- Engineer-controlled login cover image and multiple homepage/gallery images, with 1MB-per-image validation.
- Engineer request decisions are immutable after Approved, Rejected, or Pending is selected.
- Pending requests require an internal note.
- Appointment calendar UI with duplicate-time prevention, past-date prevention, and engineer-controlled unavailable dates/holidays.
- Full calendar page with appointment search.
- Direct Messenger-style client/engineer conversations.
- Profile pages with profile picture upload and engineer contact information visible to clients.
- User Management table with search.
- Client request search and association dropdown.
- Supporting-document selection with a 1MB-per-file limit.
- Four-step client registration with 18+ validation, number-only contact number, Gmail/Yahoo email validation, association details, and cascading Region → Province → Municipality → Barangay selection.
- Client registration returns to the login page instead of automatically logging the client in.

## Demo accounts
- Engineer: `engineer@agrihelp.test` / `Engineer123!`
- Client: `client@agrihelp.test` / `Client123!`

This version is still a frontend prototype using localStorage/IndexedDB for browser persistence. Firebase Authentication, Firestore, and Firebase Storage can be integrated next for production-grade authentication, database persistence, and document/media storage.

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```
"# AGRIhelp-" 
"# AGRIhelp-1-" 
"# AGRIhelp-1-" 
