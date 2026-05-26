import { runScrapers } from './scraper.js';
console.log("Triggering scraper from CLI...");
runScrapers().then(() => console.log("Done")).catch(err => console.error(err));
