// Conscious Consuming — Community configuration (the ONE place to set this for production).
//
// To light up the community page in PRODUCTION, uncomment the line below and set it to your deployed
// Community Worker origin — the URL printed by `npm run deploy` in services/commons (or its custom domain).
// Then redeploy Conscious Consuming.
//
//   window.COMMONS_ORIGIN = 'https://futurism-commons.<your-account>.workers.dev';
//
// Leave it unset for local development: on localhost, community.html tries http://localhost:8787; on any
// other host (e.g. a deployed/preview build) it shows the dignified "Community is coming" state at once,
// with no doomed cross-origin fetch or blank wait. No other file needs editing.
