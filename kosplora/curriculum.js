/* Kosplora curriculum demonstration, research round 2026-07.
   Skin-layer content only: it does not modify the signed 18-resource decision receipt.
   The data and renderer are deliberately plain files that can be inspected, copied, and challenged. */
(function(global){
  'use strict';
  const L = global.OVS_LENS || global.KOSPLORA_LENS;
  if (!L) return;
  const DATA = {
  "version": "0.2.0",
  "status": "curated-demonstration",
  "checked": "2026-07-22",
  "title": "Study routes that end in something you made",
  "dek": "Twelve guided routes turn the open web into a learning loop: orient, study, practice, make, review. Local progress stays in this browser.",
  "method": {
    "sequence": [
      "orient",
      "study",
      "practice",
      "make",
      "review"
    ],
    "reads": "Every route names outcomes, prerequisites, time, a final artifact, access conditions, and source-checked starting points. It is a demonstration curriculum, not accreditation or a promise that one route fits everyone.",
    "access": "Open means reuse rights are stated. Free means no-cost access today. Mixed means an account, eligibility rule, paid option, or restricted rights may matter.",
    "safety": "High-stakes health and legal routes teach evidence literacy only. They do not provide diagnosis, treatment, or legal advice."
  },
  "resources": [
    {
      "id": "openlearn-learning",
      "name": "Learning how to learn",
      "provider": "The Open University",
      "url": "https://www.open.edu/openlearn/education-development/learning-how-learn/",
      "format": "course",
      "access": "open",
      "license": "CC course materials; third-party exceptions",
      "account": "optional",
      "bandwidth": "low",
      "download": true,
      "note": "A six-hour introductory course with reflection activities and downloadable text formats.",
      "sourceClass": "university",
      "checked": "2026-07-22"
    },
    {
      "id": "ies-study-guide",
      "name": "Organizing Instruction and Study to Improve Student Learning",
      "provider": "What Works Clearinghouse",
      "url": "https://ies.ed.gov/ncee/wwc/PracticeGuide/1",
      "format": "practice guide",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Evidence-rated recommendations on spacing, worked examples, quizzing, explanatory questions, and delayed review.",
      "sourceClass": "government",
      "checked": "2026-07-22"
    },
    {
      "id": "cast-udl",
      "name": "Universal Design for Learning Guidelines 3.0",
      "provider": "CAST",
      "url": "https://udlguidelines.cast.org/",
      "format": "framework",
      "access": "open",
      "license": "CC BY-SA",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A barrier-aware framework for offering multiple ways to engage, understand, act, and express learning.",
      "sourceClass": "nonprofit standards body",
      "checked": "2026-07-22"
    },
    {
      "id": "learning-scientists",
      "name": "Retrieval Practice",
      "provider": "The Learning Scientists",
      "url": "https://www.learningscientists.org/retrieval-practice",
      "format": "guide",
      "access": "free",
      "license": "Free to read; provider terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Plain-language explanations and classroom materials for active recall.",
      "sourceClass": "research communication project",
      "checked": "2026-07-22"
    },
    {
      "id": "anki-manual",
      "name": "Anki Manual",
      "provider": "Anki",
      "url": "https://docs.ankiweb.net/",
      "format": "tool guide",
      "access": "open",
      "license": "Open-source software; documentation terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Documentation for building and scheduling spaced-repetition prompts; paper cards remain a valid alternative.",
      "sourceClass": "open-source project",
      "checked": "2026-07-22"
    },
    {
      "id": "zotero-quickstart",
      "name": "Zotero Quick Start Guide",
      "provider": "Zotero",
      "url": "https://www.zotero.org/support/quick_start_guide",
      "format": "tool guide",
      "access": "open",
      "license": "AGPL software; documentation terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A local-first research library for collecting, organizing, citing, and annotating sources.",
      "sourceClass": "nonprofit open-source project",
      "checked": "2026-07-22"
    },
    {
      "id": "open-textbook-library",
      "name": "Open Textbook Library",
      "provider": "Open Education Network",
      "url": "https://open.umn.edu/opentextbooks",
      "format": "library",
      "access": "open",
      "license": "Open licenses vary by book",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Complete, portable, openly licensed textbooks reviewed and used through higher-education institutions.",
      "sourceClass": "university consortium",
      "checked": "2026-07-22"
    },
    {
      "id": "oer-commons",
      "name": "OER Commons",
      "provider": "ISKME",
      "url": "https://www.oercommons.org/",
      "format": "repository",
      "access": "open",
      "license": "Open licenses vary by item",
      "account": "optional",
      "bandwidth": "low",
      "download": false,
      "note": "A large repository for finding, adapting, and sharing open educational resources.",
      "sourceClass": "nonprofit repository",
      "checked": "2026-07-22"
    },
    {
      "id": "libretexts",
      "name": "LibreTexts",
      "provider": "LibreTexts",
      "url": "https://libretexts.org/",
      "format": "library",
      "access": "open",
      "license": "Open licenses vary by library",
      "account": "optional",
      "bandwidth": "low",
      "download": true,
      "note": "A nonprofit platform of subject libraries, open texts, and adaptable course materials.",
      "sourceClass": "nonprofit repository",
      "checked": "2026-07-22"
    },
    {
      "id": "mit-ocw",
      "name": "MIT OpenCourseWare",
      "provider": "MIT",
      "url": "https://ocw.mit.edu/",
      "format": "courseware",
      "access": "open",
      "license": "CC BY-NC-SA",
      "account": "none",
      "bandwidth": "medium",
      "download": true,
      "note": "Course materials from thousands of MIT courses, with no enrollment and many downloadable packages.",
      "sourceClass": "university",
      "checked": "2026-07-22"
    },
    {
      "id": "openlearn",
      "name": "OpenLearn",
      "provider": "The Open University",
      "url": "https://www.open.edu/openlearn/free-courses/full-catalogue",
      "format": "course library",
      "access": "open",
      "license": "Mostly CC BY-NC-SA; item exceptions",
      "account": "optional",
      "bandwidth": "low",
      "download": true,
      "note": "Hundreds of free courses across broad subject areas; accounts are optional for tracking and statements.",
      "sourceClass": "university",
      "checked": "2026-07-22"
    },
    {
      "id": "openintro-stats",
      "name": "OpenIntro Statistics",
      "provider": "OpenIntro",
      "url": "https://www.openintro.org/book/os/",
      "format": "textbook",
      "access": "open",
      "license": "CC BY-SA",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A free statistics textbook with exercises, labs, data, and an accessible screen-reader PDF.",
      "sourceClass": "nonprofit open textbook project",
      "checked": "2026-07-22"
    },
    {
      "id": "seeing-theory",
      "name": "Seeing Theory",
      "provider": "Brown University",
      "url": "https://seeing-theory.brown.edu/",
      "format": "interactive",
      "access": "open",
      "license": "Open-source project; site terms",
      "account": "none",
      "bandwidth": "medium",
      "download": false,
      "note": "Interactive visual explanations of probability and statistics.",
      "sourceClass": "university",
      "checked": "2026-07-22"
    },
    {
      "id": "our-world-in-data",
      "name": "Our World in Data",
      "provider": "Global Change Data Lab",
      "url": "https://ourworldindata.org/",
      "format": "data and articles",
      "access": "open",
      "license": "CC BY for original work; source-data terms vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Charts, data, and research across global problems, with source notes and downloadable datasets.",
      "sourceClass": "nonprofit research project",
      "checked": "2026-07-22"
    },
    {
      "id": "fred",
      "name": "FRED",
      "provider": "Federal Reserve Bank of St. Louis",
      "url": "https://fred.stlouisfed.org/",
      "format": "data portal",
      "access": "free",
      "license": "Public data; source terms vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A large economic time-series database with graphs, downloads, and source metadata.",
      "sourceClass": "public institution",
      "checked": "2026-07-22"
    },
    {
      "id": "data-gov",
      "name": "Data.gov",
      "provider": "US General Services Administration",
      "url": "https://data.gov/",
      "format": "data catalog",
      "access": "free",
      "license": "US government data; dataset terms vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "The US government data catalog, useful for finding primary public datasets.",
      "sourceClass": "government",
      "checked": "2026-07-22"
    },
    {
      "id": "world-bank-data",
      "name": "World Bank Open Data",
      "provider": "World Bank",
      "url": "https://data.worldbank.org/",
      "format": "data portal",
      "access": "open",
      "license": "CC BY 4.0 for many datasets; check item terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Global development indicators with downloadable tables and country profiles.",
      "sourceClass": "international public institution",
      "checked": "2026-07-22"
    },
    {
      "id": "r4ds",
      "name": "R for Data Science",
      "provider": "Hadley Wickham, Mine Cetinkaya-Rundel, Garrett Grolemund",
      "url": "https://r4ds.hadley.nz/",
      "format": "open book",
      "access": "open",
      "license": "CC BY-NC-ND",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A complete online introduction to reproducible data work in R.",
      "sourceClass": "open book",
      "checked": "2026-07-22"
    },
    {
      "id": "calling-bullshit",
      "name": "Calling Bullshit",
      "provider": "University of Washington",
      "url": "https://www.callingbullshit.org/",
      "format": "course",
      "access": "free",
      "license": "Free to read; provider terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A course on spotting misleading uses of data, models, visualization, and quantitative language.",
      "sourceClass": "university",
      "checked": "2026-07-22"
    },
    {
      "id": "desmos",
      "name": "Desmos Graphing Calculator",
      "provider": "Desmos Studio",
      "url": "https://www.desmos.com/calculator",
      "format": "interactive tool",
      "access": "free",
      "license": "Free to use; provider terms",
      "account": "none",
      "bandwidth": "medium",
      "download": false,
      "note": "A fast graphing environment for exploring equations and checking visual claims.",
      "sourceClass": "public-benefit education company",
      "checked": "2026-07-22"
    },
    {
      "id": "openstax-writing",
      "name": "Writing Guide with Handbook",
      "provider": "OpenStax",
      "url": "https://openstax.org/details/books/writing-guide",
      "format": "textbook",
      "access": "open",
      "license": "CC BY",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A peer-reviewed college writing guide with genres, research, citation, grammar, and revision.",
      "sourceClass": "university nonprofit",
      "checked": "2026-07-22"
    },
    {
      "id": "purdue-owl",
      "name": "Purdue Online Writing Lab",
      "provider": "Purdue University",
      "url": "https://owl.purdue.edu/",
      "format": "reference",
      "access": "free",
      "license": "Free to read; provider terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Writing, research, grammar, citation, and professional communication guidance.",
      "sourceClass": "university",
      "checked": "2026-07-22"
    },
    {
      "id": "writing-commons",
      "name": "Writing Commons",
      "provider": "Writing Commons",
      "url": "https://writingcommons.org/",
      "format": "reference",
      "access": "open",
      "license": "CC BY-NC-ND unless noted",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A peer-reviewed encyclopedia for writing, research, rhetoric, and information literacy.",
      "sourceClass": "peer-reviewed open project",
      "checked": "2026-07-22"
    },
    {
      "id": "unc-writing-center",
      "name": "Tips and Tools",
      "provider": "UNC Writing Center",
      "url": "https://writingcenter.unc.edu/tips-and-tools/",
      "format": "handouts",
      "access": "free",
      "license": "Free to read; provider terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Practical handouts for drafting, argument, evidence, style, and revision.",
      "sourceClass": "university",
      "checked": "2026-07-22"
    },
    {
      "id": "hypothesis",
      "name": "Hypothesis",
      "provider": "Hypothesis",
      "url": "https://web.hypothes.is/",
      "format": "annotation tool",
      "access": "open",
      "license": "BSD software; service terms",
      "account": "required",
      "bandwidth": "low",
      "download": false,
      "note": "Open-source web annotation for close reading and shared marginal notes; local notes are an account-free alternative.",
      "sourceClass": "nonprofit open-source project",
      "checked": "2026-07-22"
    },
    {
      "id": "mdn-learn",
      "name": "Learn Web Development",
      "provider": "MDN Web Docs",
      "url": "https://developer.mozilla.org/en-US/docs/Learn_web_development",
      "format": "curriculum",
      "access": "open",
      "license": "CC BY-SA",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A structured path from complete beginner to comfortable front-end developer, with tests and challenges.",
      "sourceClass": "open web documentation project",
      "checked": "2026-07-22"
    },
    {
      "id": "odin-foundations",
      "name": "Foundations",
      "provider": "The Odin Project",
      "url": "https://www.theodinproject.com/paths/foundations/courses/foundations",
      "format": "curriculum",
      "access": "open",
      "license": "Open-source curriculum",
      "account": "optional",
      "bandwidth": "low",
      "download": true,
      "note": "A project-based path through command-line tools, HTML, CSS, JavaScript, Git, and deployment.",
      "sourceClass": "nonprofit open-source project",
      "checked": "2026-07-22"
    },
    {
      "id": "webaim-intro",
      "name": "Introduction to Web Accessibility",
      "provider": "WebAIM",
      "url": "https://webaim.org/intro/",
      "format": "guide",
      "access": "free",
      "license": "Free to read; provider terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A practical introduction to disability, barriers, principles, and implementation.",
      "sourceClass": "university-affiliated nonprofit project",
      "checked": "2026-07-22"
    },
    {
      "id": "wcag22",
      "name": "Web Content Accessibility Guidelines 2.2",
      "provider": "W3C Web Accessibility Initiative",
      "url": "https://www.w3.org/TR/WCAG22/",
      "format": "standard",
      "access": "open",
      "license": "W3C document license",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "The normative accessibility standard; use it with explanatory guidance and human testing.",
      "sourceClass": "standards body",
      "checked": "2026-07-22"
    },
    {
      "id": "w3c-easy-checks",
      "name": "Easy Checks",
      "provider": "W3C Web Accessibility Initiative",
      "url": "https://www.w3.org/WAI/test-evaluate/preliminary/",
      "format": "checklist",
      "access": "open",
      "license": "W3C document license",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A quick first review of common accessibility barriers; explicitly not a complete conformance test.",
      "sourceClass": "standards body",
      "checked": "2026-07-22"
    },
    {
      "id": "wave",
      "name": "WAVE Web Accessibility Evaluation Tool",
      "provider": "WebAIM",
      "url": "https://wave.webaim.org/",
      "format": "testing tool",
      "access": "free",
      "license": "Free service; provider terms",
      "account": "none",
      "bandwidth": "medium",
      "download": false,
      "note": "Automated page feedback that helps reveal issues but does not replace keyboard, screen-reader, and user testing.",
      "sourceClass": "university-affiliated nonprofit project",
      "checked": "2026-07-22"
    },
    {
      "id": "github-pages",
      "name": "Creating a GitHub Pages site",
      "provider": "GitHub Docs",
      "url": "https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site",
      "format": "guide",
      "access": "free",
      "license": "Free to read; platform terms",
      "account": "required",
      "bandwidth": "low",
      "download": true,
      "note": "A straightforward path for publishing a static site from a repository.",
      "sourceClass": "platform documentation",
      "checked": "2026-07-22"
    },
    {
      "id": "freecodecamp",
      "name": "Responsive Web Design",
      "provider": "freeCodeCamp",
      "url": "https://www.freecodecamp.org/learn/2022/responsive-web-design/",
      "format": "curriculum",
      "access": "open",
      "license": "Open-source curriculum",
      "account": "optional",
      "bandwidth": "medium",
      "download": false,
      "note": "Interactive HTML and CSS lessons with projects; an account is useful for saved progress.",
      "sourceClass": "nonprofit open-source project",
      "checked": "2026-07-22"
    },
    {
      "id": "civic-online-reasoning",
      "name": "Civic Online Reasoning",
      "provider": "Digital Inquiry Group",
      "url": "https://cor.inquirygroup.org/",
      "format": "curriculum",
      "access": "free",
      "license": "Free classroom materials; provider terms",
      "account": "optional",
      "bandwidth": "low",
      "download": true,
      "note": "Lessons and assessments for lateral reading, source investigation, and online evidence evaluation.",
      "sourceClass": "nonprofit research group",
      "checked": "2026-07-22"
    },
    {
      "id": "web-literacy",
      "name": "Web Literacy for Student Fact-Checkers",
      "provider": "Mike Caulfield",
      "url": "https://pressbooks.pub/webliteracy/",
      "format": "open book",
      "access": "open",
      "license": "CC BY",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A practical field guide to checking claims by leaving a page, tracing evidence, and finding better coverage.",
      "sourceClass": "open book",
      "checked": "2026-07-22"
    },
    {
      "id": "doaj",
      "name": "Directory of Open Access Journals",
      "provider": "DOAJ",
      "url": "https://doaj.org/",
      "format": "research index",
      "access": "open",
      "license": "Open metadata; article licenses vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A nonprofit directory of peer-reviewed open-access journals meeting published quality criteria.",
      "sourceClass": "nonprofit scholarly infrastructure",
      "checked": "2026-07-22"
    },
    {
      "id": "core",
      "name": "CORE",
      "provider": "The Open University and Jisc",
      "url": "https://core.ac.uk/",
      "format": "research index",
      "access": "open",
      "license": "Open metadata and APIs; item licenses vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A large discovery service for open scholarly literature and repositories.",
      "sourceClass": "nonprofit scholarly infrastructure",
      "checked": "2026-07-22"
    },
    {
      "id": "openalex",
      "name": "OpenAlex",
      "provider": "OurResearch",
      "url": "https://openalex.org/",
      "format": "research graph",
      "access": "open",
      "license": "CC0 data",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "An open catalog of scholarly works, authors, institutions, sources, topics, and citations.",
      "sourceClass": "nonprofit scholarly infrastructure",
      "checked": "2026-07-22"
    },
    {
      "id": "crossref-search",
      "name": "Crossref Metadata Search",
      "provider": "Crossref",
      "url": "https://search.crossref.org/",
      "format": "metadata search",
      "access": "open",
      "license": "Open metadata",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A DOI and publication-metadata search for locating canonical scholarly records.",
      "sourceClass": "nonprofit scholarly infrastructure",
      "checked": "2026-07-22"
    },
    {
      "id": "internet-archive",
      "name": "Wayback Machine",
      "provider": "Internet Archive",
      "url": "https://web.archive.org/",
      "format": "web archive",
      "access": "free",
      "license": "Archived-item rights vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A web archive for checking how pages and claims changed over time.",
      "sourceClass": "nonprofit archive",
      "checked": "2026-07-22"
    },
    {
      "id": "nasa-climate",
      "name": "Climate Change",
      "provider": "NASA Science",
      "url": "https://science.nasa.gov/climate-change/",
      "format": "evidence hub",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Current explanations, evidence, causes, effects, and NASA datasets for climate science.",
      "sourceClass": "government science agency",
      "checked": "2026-07-22"
    },
    {
      "id": "ipcc-synthesis",
      "name": "AR6 Synthesis Report",
      "provider": "Intergovernmental Panel on Climate Change",
      "url": "https://www.ipcc.ch/synthesis-report/",
      "format": "assessment report",
      "access": "free",
      "license": "IPCC terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "The integrated 2023 assessment of climate science, impacts, adaptation, and mitigation.",
      "sourceClass": "intergovernmental scientific body",
      "checked": "2026-07-22"
    },
    {
      "id": "ipcc-atlas",
      "name": "AR6 Interactive Atlas",
      "provider": "Intergovernmental Panel on Climate Change",
      "url": "https://interactive-atlas.ipcc.ch/",
      "format": "interactive data atlas",
      "access": "free",
      "license": "IPCC terms; open-source components",
      "account": "none",
      "bandwidth": "high",
      "download": false,
      "note": "Maps, graphs, tables, observations, and projections across regions, scenarios, and warming levels.",
      "sourceClass": "intergovernmental scientific body",
      "checked": "2026-07-22"
    },
    {
      "id": "noaa-climate",
      "name": "Climate Education Resource Collection",
      "provider": "NOAA",
      "url": "https://www.noaa.gov/education/resource-collections/climate",
      "format": "resource collection",
      "access": "free",
      "license": "US government publication; linked-item terms vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Background, activities, data, and teaching resources for climate and Earth systems.",
      "sourceClass": "government science agency",
      "checked": "2026-07-22"
    },
    {
      "id": "clean-collection",
      "name": "CLEAN Collection",
      "provider": "Climate Literacy and Energy Awareness Network",
      "url": "https://cleanet.org/clean/educational_resources/index.html",
      "format": "reviewed collection",
      "access": "free",
      "license": "Linked-item terms vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A rigorously reviewed collection of climate and energy lessons, visualizations, datasets, and activities.",
      "sourceClass": "research and educator network",
      "checked": "2026-07-22"
    },
    {
      "id": "owid-climate",
      "name": "Climate Change",
      "provider": "Our World in Data",
      "url": "https://ourworldindata.org/climate-change",
      "format": "data and articles",
      "access": "open",
      "license": "CC BY for original work; source-data terms vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A data-rich overview of emissions, energy, temperature, impacts, and country differences.",
      "sourceClass": "nonprofit research project",
      "checked": "2026-07-22"
    },
    {
      "id": "enroads",
      "name": "En-ROADS Climate Solutions Simulator",
      "provider": "Climate Interactive and MIT Sloan",
      "url": "https://www.climateinteractive.org/en-roads/",
      "format": "simulation",
      "access": "free",
      "license": "Free to use; provider terms",
      "account": "none",
      "bandwidth": "high",
      "download": false,
      "note": "A policy simulator for testing combinations of energy, land, industry, and climate actions.",
      "sourceClass": "nonprofit and university project",
      "checked": "2026-07-22"
    },
    {
      "id": "icivics",
      "name": "iCivics",
      "provider": "iCivics",
      "url": "https://ed.icivics.org/",
      "format": "curriculum and games",
      "access": "free",
      "license": "Free to use; item terms vary",
      "account": "optional",
      "bandwidth": "medium",
      "download": true,
      "note": "Nonpartisan games, simulations, lessons, document quests, and family activities about civic institutions.",
      "sourceClass": "nonprofit civic education project",
      "checked": "2026-07-22"
    },
    {
      "id": "cornell-lii",
      "name": "Legal Information Institute",
      "provider": "Cornell Law School",
      "url": "https://www.law.cornell.edu/",
      "format": "legal reference",
      "access": "free",
      "license": "Free to read; provider terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Free primary and explanatory legal information, including constitutions, statutes, regulations, cases, and Wex.",
      "sourceClass": "university public-interest project",
      "checked": "2026-07-22"
    },
    {
      "id": "wex",
      "name": "Wex Legal Dictionary and Encyclopedia",
      "provider": "Cornell Legal Information Institute",
      "url": "https://www.law.cornell.edu/wex",
      "format": "legal encyclopedia",
      "access": "free",
      "license": "Free to read; provider terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A supervised, community-built dictionary for demystifying US legal language; not legal advice.",
      "sourceClass": "university public-interest project",
      "checked": "2026-07-22"
    },
    {
      "id": "oyez",
      "name": "Oyez",
      "provider": "Cornell LII, Justia, and Chicago-Kent",
      "url": "https://www.oyez.org/",
      "format": "case archive",
      "access": "free",
      "license": "Free to access; item terms vary",
      "account": "none",
      "bandwidth": "medium",
      "download": true,
      "note": "Supreme Court case summaries, opinions, argument audio, and justice information.",
      "sourceClass": "university public-interest project",
      "checked": "2026-07-22"
    },
    {
      "id": "congress",
      "name": "Congress.gov",
      "provider": "Library of Congress",
      "url": "https://www.congress.gov/",
      "format": "primary-source database",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Official federal legislative information, including bills, actions, committees, records, and member data.",
      "sourceClass": "government",
      "checked": "2026-07-22"
    },
    {
      "id": "regulations",
      "name": "Regulations.gov",
      "provider": "US General Services Administration",
      "url": "https://www.regulations.gov/",
      "format": "public process portal",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Federal rulemaking dockets, notices, supporting documents, and public-comment opportunities.",
      "sourceClass": "government",
      "checked": "2026-07-22"
    },
    {
      "id": "census-data",
      "name": "data.census.gov",
      "provider": "US Census Bureau",
      "url": "https://data.census.gov/",
      "format": "data portal",
      "access": "free",
      "license": "US government data",
      "account": "none",
      "bandwidth": "medium",
      "download": true,
      "note": "Primary demographic, social, economic, and housing data for public-context questions.",
      "sourceClass": "government",
      "checked": "2026-07-22"
    },
    {
      "id": "medlineplus-eval",
      "name": "Evaluating Internet Health Information",
      "provider": "National Library of Medicine",
      "url": "https://medlineplus.gov/webeval/webeval.html",
      "format": "tutorial",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A five-part tutorial and downloadable checklist for judging health websites and online claims.",
      "sourceClass": "government health library",
      "checked": "2026-07-22"
    },
    {
      "id": "nccih-science",
      "name": "Know the Science",
      "provider": "National Center for Complementary and Integrative Health",
      "url": "https://www.nccih.nih.gov/health/know-science",
      "format": "interactive modules",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Interactive modules on studies, journal articles, health news, risk, claims, and conflicts of interest.",
      "sourceClass": "government research agency",
      "checked": "2026-07-22"
    },
    {
      "id": "pubmed",
      "name": "PubMed",
      "provider": "National Library of Medicine",
      "url": "https://pubmed.ncbi.nlm.nih.gov/",
      "format": "research index",
      "access": "free",
      "license": "US government database; article rights vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A biomedical literature index with abstracts, publication types, and links to full text when available.",
      "sourceClass": "government scholarly infrastructure",
      "checked": "2026-07-22"
    },
    {
      "id": "clinicaltrials-basics",
      "name": "Learn About Studies",
      "provider": "ClinicalTrials.gov",
      "url": "https://clinicaltrials.gov/study-basics/learn-about-studies",
      "format": "guide and registry",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Guidance for understanding clinical studies and a registry for protocols, status, and reported results.",
      "sourceClass": "government scholarly infrastructure",
      "checked": "2026-07-22"
    },
    {
      "id": "openwho",
      "name": "OpenWHO",
      "provider": "World Health Organization",
      "url": "https://openwho.org/",
      "format": "course platform",
      "access": "free",
      "license": "Course terms vary",
      "account": "optional",
      "bandwidth": "medium",
      "download": true,
      "note": "Open online courses for emergency response, public health, and operational knowledge.",
      "sourceClass": "intergovernmental health agency",
      "checked": "2026-07-22"
    },
    {
      "id": "cdc-health-literacy",
      "name": "Health Literacy",
      "provider": "US Centers for Disease Control and Prevention",
      "url": "https://www.cdc.gov/health-literacy/php/about/index.html",
      "format": "guidance",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Definitions, tools, and communication practices for finding, understanding, and using health information.",
      "sourceClass": "government health agency",
      "checked": "2026-07-22"
    },
    {
      "id": "cochrane-evidence",
      "name": "Cochrane Evidence",
      "provider": "Cochrane",
      "url": "https://www.cochrane.org/evidence",
      "format": "evidence summaries",
      "access": "free",
      "license": "Free summaries; review rights vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Plain-language summaries and systematic-review evidence across health interventions.",
      "sourceClass": "nonprofit evidence network",
      "checked": "2026-07-22"
    },
    {
      "id": "world-history-commons",
      "name": "World History Commons",
      "provider": "George Mason University",
      "url": "https://worldhistorycommons.org/",
      "format": "primary-source collection",
      "access": "open",
      "license": "CC BY-NC-SA unless noted",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Primary sources with scholarly context, teaching modules, methods, and website reviews across world history.",
      "sourceClass": "university open project",
      "checked": "2026-07-22"
    },
    {
      "id": "loc-primary",
      "name": "Primary Source Sets",
      "provider": "Library of Congress",
      "url": "https://www.loc.gov/programs/teachers/classroom-materials/primary-source-sets/",
      "format": "primary-source sets",
      "access": "free",
      "license": "US government and item-specific rights",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Sets with historical context and teaching ideas drawn from digitized collections.",
      "sourceClass": "government archive",
      "checked": "2026-07-22"
    },
    {
      "id": "dpla-primary",
      "name": "Primary Source Sets",
      "provider": "Digital Public Library of America",
      "url": "https://dp.la/primary-source-sets",
      "format": "primary-source sets",
      "access": "free",
      "license": "Item rights vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Teacher-reviewed sets combining archival items, overviews, questions, and teaching guides.",
      "sourceClass": "nonprofit digital library",
      "checked": "2026-07-22"
    },
    {
      "id": "smithsonian-lab",
      "name": "Smithsonian Learning Lab",
      "provider": "Smithsonian Institution",
      "url": "https://learninglab.si.edu/",
      "format": "museum learning platform",
      "access": "free",
      "license": "Item rights vary",
      "account": "optional",
      "bandwidth": "medium",
      "download": false,
      "note": "Millions of Smithsonian objects and thousands of assembled learning collections; accounts enable creating and sharing.",
      "sourceClass": "public museum and research institution",
      "checked": "2026-07-22"
    },
    {
      "id": "openstax-world-history",
      "name": "World History, Volume 1",
      "provider": "OpenStax",
      "url": "https://openstax.org/details/books/world-history-volume-1",
      "format": "textbook",
      "access": "open",
      "license": "CC BY",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A peer-reviewed, openly licensed world-history survey with review questions and source material.",
      "sourceClass": "university nonprofit",
      "checked": "2026-07-22"
    },
    {
      "id": "world-digital-library",
      "name": "World Digital Library Collection",
      "provider": "Library of Congress",
      "url": "https://www.loc.gov/collections/world-digital-library/about-this-collection/",
      "format": "global archive",
      "access": "free",
      "license": "Item rights vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Digitized cultural materials from institutions around the world, with multilingual descriptions.",
      "sourceClass": "government archive and international collaboration",
      "checked": "2026-07-22"
    },
    {
      "id": "europeana",
      "name": "Europeana",
      "provider": "Europeana Foundation",
      "url": "https://www.europeana.eu/en",
      "format": "cultural heritage portal",
      "access": "free",
      "license": "Item rights vary and are labeled",
      "account": "none",
      "bandwidth": "medium",
      "download": false,
      "note": "Digitized art, books, photographs, music, and archival objects from European cultural institutions.",
      "sourceClass": "nonprofit cultural infrastructure",
      "checked": "2026-07-22"
    },
    {
      "id": "language-transfer",
      "name": "Language Transfer Courses",
      "provider": "Language Transfer",
      "url": "https://www.languagetransfer.org/courses",
      "format": "audio course",
      "access": "free",
      "license": "Free to use and download; provider terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Beginner-friendly audio courses built around pausing, thinking, and answering aloud.",
      "sourceClass": "independent educational project",
      "checked": "2026-07-22"
    },
    {
      "id": "tatoeba",
      "name": "Tatoeba",
      "provider": "Tatoeba Association",
      "url": "https://tatoeba.org/en/",
      "format": "sentence corpus",
      "access": "open",
      "license": "Creative Commons licenses vary by contribution",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "An open, collaborative corpus of translated example sentences across hundreds of languages.",
      "sourceClass": "nonprofit open-data project",
      "checked": "2026-07-22"
    },
    {
      "id": "wiktionary",
      "name": "Wiktionary",
      "provider": "Wikimedia community",
      "url": "https://www.wiktionary.org/",
      "format": "dictionary",
      "access": "open",
      "license": "CC BY-SA",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A multilingual dictionary with definitions, pronunciation, etymology, inflection, and usage examples.",
      "sourceClass": "nonprofit open-knowledge project",
      "checked": "2026-07-22"
    },
    {
      "id": "librivox",
      "name": "LibriVox",
      "provider": "LibriVox volunteers",
      "url": "https://librivox.org/",
      "format": "audio library",
      "access": "open",
      "license": "Public-domain recordings",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Volunteer-read public-domain books for listening, shadowing, and transcript comparison.",
      "sourceClass": "volunteer public-domain project",
      "checked": "2026-07-22"
    },
    {
      "id": "easy-languages",
      "name": "Easy Languages",
      "provider": "Easy Languages",
      "url": "https://www.easy-languages.org/",
      "format": "street-interview videos",
      "access": "free",
      "license": "Free to watch; provider terms",
      "account": "none",
      "bandwidth": "medium",
      "download": false,
      "note": "Natural speech videos with on-screen subtitles across many languages.",
      "sourceClass": "nonprofit media project",
      "checked": "2026-07-22"
    },
    {
      "id": "storyweaver",
      "name": "StoryWeaver",
      "provider": "Pratham Books",
      "url": "https://storyweaver.org.in/en/",
      "format": "multilingual story library",
      "access": "open",
      "license": "CC BY 4.0 for stories and illustrations; media exceptions",
      "account": "optional",
      "bandwidth": "low",
      "download": true,
      "note": "Open multilingual children’s stories that can be read, downloaded, adapted, and translated.",
      "sourceClass": "nonprofit open-content project",
      "checked": "2026-07-22"
    },
    {
      "id": "phet",
      "name": "PhET Interactive Simulations",
      "provider": "University of Colorado Boulder",
      "url": "https://phet.colorado.edu/en/",
      "format": "interactive simulations",
      "access": "open",
      "license": "Open-source software; CC BY content unless noted",
      "account": "none",
      "bandwidth": "high",
      "download": true,
      "note": "Research-based math and science simulations with immediate feedback, downloads, translations, and accessible options.",
      "sourceClass": "university open project",
      "checked": "2026-07-22"
    },
    {
      "id": "hhmi",
      "name": "HHMI BioInteractive",
      "provider": "Howard Hughes Medical Institute",
      "url": "https://www.biointeractive.org/",
      "format": "science resources",
      "access": "free",
      "license": "Free educational use; item terms vary",
      "account": "none",
      "bandwidth": "medium",
      "download": true,
      "note": "Scientifically reviewed films, data points, virtual labs, activities, and real research datasets.",
      "sourceClass": "nonprofit research institute",
      "checked": "2026-07-22"
    },
    {
      "id": "openstax-science",
      "name": "OpenStax Science Textbooks",
      "provider": "OpenStax",
      "url": "https://openstax.org/subjects/science",
      "format": "textbook library",
      "access": "open",
      "license": "CC BY",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Peer-reviewed open textbooks in biology, chemistry, physics, astronomy, and related fields.",
      "sourceClass": "university nonprofit",
      "checked": "2026-07-22"
    },
    {
      "id": "science-buddies",
      "name": "Science Buddies Project Guide",
      "provider": "Science Buddies",
      "url": "https://www.sciencebuddies.org/science-fair-projects/science-fair",
      "format": "project guide",
      "access": "free",
      "license": "Free to read; provider terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Step-by-step guidance for questions, variables, experiments, data, and science-fair reports.",
      "sourceClass": "nonprofit science education project",
      "checked": "2026-07-22"
    },
    {
      "id": "zooniverse",
      "name": "Zooniverse",
      "provider": "Citizen Science Alliance",
      "url": "https://www.zooniverse.org/",
      "format": "citizen science",
      "access": "open",
      "license": "Open-source platform; project data terms vary",
      "account": "optional",
      "bandwidth": "medium",
      "download": false,
      "note": "Real research projects where volunteers classify images, transcribe records, and contribute observations.",
      "sourceClass": "nonprofit research collaboration",
      "checked": "2026-07-22"
    },
    {
      "id": "inaturalist",
      "name": "iNaturalist",
      "provider": "California Academy of Sciences and National Geographic Society",
      "url": "https://www.inaturalist.org/",
      "format": "observation platform",
      "access": "open",
      "license": "Open-source platform; observation licenses vary",
      "account": "optional",
      "bandwidth": "medium",
      "download": false,
      "note": "A biodiversity observation network for identifying organisms and contributing research-grade records.",
      "sourceClass": "nonprofit research platform",
      "checked": "2026-07-22"
    },
    {
      "id": "scratch",
      "name": "Scratch",
      "provider": "MIT Media Lab",
      "url": "https://scratch.mit.edu/",
      "format": "creative coding platform",
      "access": "open",
      "license": "Open-source editor; project media licenses vary",
      "account": "optional",
      "bandwidth": "medium",
      "download": false,
      "note": "Block-based creative coding for stories, games, simulations, and remixes.",
      "sourceClass": "university nonprofit project",
      "checked": "2026-07-22"
    },
    {
      "id": "exercism",
      "name": "Exercism",
      "provider": "Exercism",
      "url": "https://exercism.org/",
      "format": "practice platform",
      "access": "open",
      "license": "Open-source platform and exercises",
      "account": "required",
      "bandwidth": "low",
      "download": false,
      "note": "Free programming practice across many languages with automated analysis and optional human mentoring.",
      "sourceClass": "nonprofit open-source project",
      "checked": "2026-07-22"
    },
    {
      "id": "carpentries",
      "name": "The Carpentries Lessons",
      "provider": "The Carpentries",
      "url": "https://carpentries.org/lessons/",
      "format": "lesson collection",
      "access": "open",
      "license": "CC BY 4.0",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Collaboratively developed, tested lessons in coding, data, research computing, and library skills.",
      "sourceClass": "nonprofit open education project",
      "checked": "2026-07-22"
    },
    {
      "id": "khan-kids",
      "name": "Khan Academy Kids",
      "provider": "Khan Academy",
      "url": "https://www.khanacademy.org/kids",
      "format": "early-learning app",
      "access": "free",
      "license": "Free app; provider terms",
      "account": "required",
      "bandwidth": "high",
      "download": false,
      "note": "An ad-free, no-subscription early-learning program for ages two to eight with books, games, and creative activities.",
      "sourceClass": "nonprofit education project",
      "checked": "2026-07-22"
    },
    {
      "id": "bookshare",
      "name": "Bookshare",
      "provider": "Benetech",
      "url": "https://www.bookshare.org/",
      "format": "accessible ebook library",
      "access": "mixed",
      "license": "Specialized-access and item rights",
      "account": "eligibility",
      "bandwidth": "low",
      "download": true,
      "note": "Accessible ebooks with audio, highlighting, large text, and braille; most copyrighted titles require a qualifying print disability.",
      "sourceClass": "nonprofit accessibility service",
      "checked": "2026-07-22"
    },
    {
      "id": "pbs-learningmedia",
      "name": "PBS LearningMedia",
      "provider": "PBS and local stations",
      "url": "https://www.pbslearningmedia.org/",
      "format": "media library",
      "access": "free",
      "license": "Free to use; item terms vary",
      "account": "optional",
      "bandwidth": "medium",
      "download": false,
      "note": "Educational video, interactives, lesson plans, and primary sources across grade levels and subjects.",
      "sourceClass": "public media education project",
      "checked": "2026-07-22"
    },
    {
      "id": "code-org",
      "name": "Code.org",
      "provider": "Code.org",
      "url": "https://code.org/students",
      "format": "coding curriculum",
      "access": "free",
      "license": "Free to use; curriculum terms vary",
      "account": "optional",
      "bandwidth": "medium",
      "download": false,
      "note": "Guided computer-science courses and creative projects for children and beginners.",
      "sourceClass": "nonprofit education project",
      "checked": "2026-07-22"
    },
    {
      "id": "global-digital-library",
      "name": "Global Digital Library",
      "provider": "Global Digital Library",
      "url": "https://digitallibrary.io/",
      "format": "multilingual story library",
      "access": "open",
      "license": "Open licenses vary by item",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Early-grade reading books and learning materials in many languages, built for broad access.",
      "sourceClass": "international education initiative",
      "checked": "2026-07-22"
    },
    {
      "id": "cs50x",
      "name": "CS50x",
      "provider": "Harvard University",
      "url": "https://cs50.harvard.edu/x/2026/",
      "format": "course",
      "access": "free",
      "license": "Free course access; code and material terms vary",
      "account": "optional",
      "bandwidth": "high",
      "download": true,
      "note": "A current introductory computer-science course with problem sets and a final project; prior experience is not required.",
      "sourceClass": "university",
      "checked": "2026-07-22"
    },
    {
      "id": "openalex-api",
      "name": "OpenAlex API and Data",
      "provider": "OurResearch",
      "url": "https://docs.openalex.org/",
      "format": "documentation and data",
      "access": "open",
      "license": "CC0 data",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Open documentation for querying and downloading the scholarly graph.",
      "sourceClass": "nonprofit scholarly infrastructure",
      "checked": "2026-07-22"
    },
    {
      "id": "eric",
      "name": "ERIC",
      "provider": "US Department of Education",
      "url": "https://eric.ed.gov/",
      "format": "research index",
      "access": "free",
      "license": "US government database; item rights vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "An education research index with descriptors, abstracts, and links to available full text.",
      "sourceClass": "government scholarly infrastructure",
      "checked": "2026-07-22"
    },
    {
      "id": "worldcat",
      "name": "WorldCat",
      "provider": "OCLC",
      "url": "https://search.worldcat.org/",
      "format": "library catalog",
      "access": "free",
      "license": "Free search; provider terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A union catalog for locating books and other materials in libraries, including nearby holdings.",
      "sourceClass": "library cooperative",
      "checked": "2026-07-22"
    }
  ],
  "routes": [
    {
      "id": "learn-how",
      "title": "Build a learning system",
      "deck": "Turn study time into retrieval, feedback, reflection, and durable memory instead of a prettier pile of notes.",
      "focus": "foundations",
      "level": "Beginner",
      "weeks": 3,
      "hours": 2,
      "access": "no-account",
      "artifact": "A one-page learning protocol, 20 retrieval prompts, and a two-week review calendar.",
      "prerequisites": "Choose one real topic you want to learn. No academic background is assumed.",
      "outcomes": [
        "Distinguish recognition from active recall.",
        "Plan spaced and interleaved practice.",
        "Use delayed self-testing to find weak knowledge.",
        "Revise a study system from evidence rather than mood."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Write a 200-word learning history: what you tried, what lasted, and where attention or access became a barrier.",
          "evidence": "A baseline note with one target and one obstacle.",
          "resources": [
            "openlearn-learning"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Read the evidence-rated study recommendations and map them against UDL barriers that matter in your context.",
          "evidence": "A table linking at least four practices to your own study conditions.",
          "resources": [
            "ies-study-guide",
            "cast-udl"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Turn one short reading into ten answerable prompts. Close the source, retrieve, check, and repeat after forty-eight hours.",
          "evidence": "Ten prompts with first-try and delayed results.",
          "resources": [
            "learning-scientists",
            "anki-manual"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Assemble a weekly protocol with a start ritual, retrieval block, worked-example block, project block, and stop rule.",
          "evidence": "A schedule that fits your real week and names what gets dropped when time is tight.",
          "resources": [
            "openlearn-learning",
            "ies-study-guide"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Predict your score before a delayed quiz, compare prediction with performance, then revise the protocol.",
          "evidence": "A short calibration note and one documented change.",
          "resources": [
            "openlearn-learning",
            "learning-scientists"
          ]
        }
      ]
    },
    {
      "id": "statistics",
      "title": "Read data without being fooled",
      "deck": "Build statistical intuition, inspect public data, and make one honest chart with uncertainty and provenance.",
      "focus": "evidence",
      "level": "Beginner to intermediate",
      "weeks": 6,
      "hours": 4,
      "access": "no-account",
      "artifact": "A reproducible one-page data story with a chart, source note, uncertainty paragraph, and a list of checks.",
      "prerequisites": "Comfort with arithmetic. Coding is optional; a spreadsheet is enough.",
      "outcomes": [
        "Explain sampling, variation, association, and uncertainty in plain language.",
        "Trace a chart to its underlying dataset and definitions.",
        "Choose a chart that matches the question.",
        "State what the data cannot establish."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Use interactive probability examples to describe variation before calculating anything.",
          "evidence": "Three screenshots or sketches with a one-sentence interpretation each.",
          "resources": [
            "seeing-theory"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Work through selected OpenIntro chapters on data, sampling, probability, and confidence intervals.",
          "evidence": "A glossary of ten terms written without copying definitions.",
          "resources": [
            "openintro-stats"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Choose one FRED or Our World in Data series. Reproduce a summary, inspect units and missingness, and test a second time window.",
          "evidence": "A source log and two alternative chart views.",
          "resources": [
            "fred",
            "our-world-in-data"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Build the data story in a spreadsheet or with R. Include the dataset, transformations, chart, and plain-language result.",
          "evidence": "A file another person can rerun or audit.",
          "resources": [
            "r4ds",
            "data-gov",
            "world-bank-data"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Try to break your own conclusion: inspect the baseline, denominator, aggregation, time span, and plausible confounders.",
          "evidence": "An uncertainty paragraph and at least one softened or corrected sentence.",
          "resources": [
            "calling-bullshit",
            "openintro-stats"
          ]
        }
      ]
    },
    {
      "id": "writing",
      "title": "Write an evidence-based argument",
      "deck": "Move from a question to a defensible claim, source trail, complete draft, and revision memo.",
      "focus": "foundations",
      "level": "Beginner to intermediate",
      "weeks": 5,
      "hours": 4,
      "access": "no-account",
      "artifact": "A 1,200-word argument, annotated source log, and revision memo explaining the largest change.",
      "prerequisites": "A question you genuinely care about and access to a text editor.",
      "outcomes": [
        "Narrow a research question into a contestable thesis.",
        "Use sources as evidence rather than decoration.",
        "Signal uncertainty and counterarguments.",
        "Revise structure before polishing sentences."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Draft a question, audience, purpose, and provisional answer. Then list what evidence could prove you wrong.",
          "evidence": "A one-page argument brief.",
          "resources": [
            "purdue-owl"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Study genre, claims, evidence, citation, and research ethics in an open writing text.",
          "evidence": "Notes organized by decisions you must make, not chapter headings.",
          "resources": [
            "openstax-writing",
            "writing-commons"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Annotate three sources. For each, record the claim, evidence, limitation, useful passage, and relationship to the others.",
          "evidence": "Three source cards in Zotero, Hypothesis, or a local document.",
          "resources": [
            "zotero-quickstart",
            "hypothesis"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Write the full draft with a visible line of reasoning, linked evidence, and one serious counterargument.",
          "evidence": "A complete draft with citations and a bibliography.",
          "resources": [
            "purdue-owl",
            "openstax-writing"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Reverse-outline the draft, read it aloud, ask a reader to summarize the claim, and revise the structure first.",
          "evidence": "A revision memo naming what changed, why, and what remains uncertain.",
          "resources": [
            "unc-writing-center",
            "writing-commons"
          ]
        }
      ]
    },
    {
      "id": "accessible-web",
      "title": "Build an accessible website",
      "deck": "Learn the web by shipping a small site that works with keyboards, zoom, narrow screens, and assistive technology.",
      "focus": "build",
      "level": "Beginner",
      "weeks": 8,
      "hours": 6,
      "access": "mixed",
      "artifact": "A deployed single-page website, accessibility checklist, test notes, and known-limitations statement.",
      "prerequisites": "A computer capable of editing text files. No programming experience is required.",
      "outcomes": [
        "Use semantic HTML and resilient CSS.",
        "Test keyboard access, focus, reflow, contrast, and text alternatives.",
        "Interpret automated findings without treating them as proof.",
        "Publish and document a small web project."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Complete MDN getting-started material and hand-write a semantic page before adding styles.",
          "evidence": "A local HTML page with headings, landmarks, links, a list, and an image alternative.",
          "resources": [
            "mdn-learn"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Work through a foundations sequence while studying disability and barrier concepts alongside code.",
          "evidence": "A project plan that pairs each feature with an accessibility risk.",
          "resources": [
            "odin-foundations",
            "webaim-intro"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Use only the keyboard, zoom to 200 percent, narrow the viewport, run Easy Checks, and inspect automated WAVE findings.",
          "evidence": "A test log separating observed barriers from automated warnings.",
          "resources": [
            "w3c-easy-checks",
            "wave"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Build the final page, include a skip link and visible focus, then deploy it with a documented source repository.",
          "evidence": "A live URL and source link.",
          "resources": [
            "github-pages",
            "freecodecamp"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Map the important findings to WCAG 2.2, fix what you can, and state what still needs screen-reader or user testing.",
          "evidence": "A concise conformance-not-claimed note and retest record.",
          "resources": [
            "wcag22",
            "w3c-easy-checks"
          ]
        }
      ]
    },
    {
      "id": "claim-investigation",
      "title": "Investigate a claim on the open web",
      "deck": "Trace a claim beyond the page that repeats it, locate the underlying evidence, and publish a calibrated conclusion.",
      "focus": "evidence",
      "level": "Beginner to intermediate",
      "weeks": 4,
      "hours": 3,
      "access": "no-account",
      "artifact": "An evidence dossier with a claim table, source chain, confidence statement, and correction history.",
      "prerequisites": "Bring one consequential but answerable claim. Avoid private allegations about individuals.",
      "outcomes": [
        "Use lateral reading before deep reading.",
        "Separate primary evidence, interpretation, reporting, and repetition.",
        "Locate canonical scholarly records and open copies.",
        "Express confidence without collapsing uncertainty into true or false."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Write the claim exactly, identify who benefits if it spreads, and investigate the first source by opening new tabs.",
          "evidence": "A claim card with source, date, scope, and initial questions.",
          "resources": [
            "civic-online-reasoning",
            "web-literacy"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Learn the roles of journal directories, repository search, scholarly graphs, and DOI metadata.",
          "evidence": "A search plan naming which tool answers which question.",
          "resources": [
            "doaj",
            "core",
            "openalex",
            "crossref-search"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Trace one repeated statement to the earliest reachable evidence. Save an archived version and record every transformation.",
          "evidence": "A source-chain diagram with direct links.",
          "resources": [
            "internet-archive",
            "zotero-quickstart"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Build a table of claim, evidence, source class, conflicts, limitations, and what would change your mind.",
          "evidence": "A shareable dossier whose citations open to the relevant evidence.",
          "resources": [
            "zotero-quickstart",
            "core"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Ask a devil’s advocate to find the strongest rival explanation, then search specifically for disconfirming evidence.",
          "evidence": "A revised confidence statement and a dated correction note.",
          "resources": [
            "civic-online-reasoning",
            "openalex"
          ]
        }
      ]
    },
    {
      "id": "climate",
      "title": "Understand climate evidence locally",
      "deck": "Connect physical mechanisms, observed records, model projections, uncertainty, and local decisions without confusing assessment with advocacy.",
      "focus": "science",
      "level": "Beginner to intermediate",
      "weeks": 6,
      "hours": 4,
      "access": "no-account",
      "artifact": "A local climate briefing with one observed trend, one regional projection, uncertainties, and clearly separated policy choices.",
      "prerequisites": "Basic graph reading. Choose a region you know.",
      "outcomes": [
        "Distinguish weather, climate, forcing, observation, projection, and scenario.",
        "Read confidence language and multiple lines of evidence.",
        "Use regional data without claiming street-level precision.",
        "Separate scientific findings from value-based policy choices."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Read NASA’s mechanism and evidence overview, then explain the greenhouse effect with a diagram and no borrowed sentences.",
          "evidence": "A one-page mechanism sketch with three evidence types.",
          "resources": [
            "nasa-climate"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Read the IPCC Synthesis Report headline findings and a relevant NOAA learning collection. Track confidence terms.",
          "evidence": "A table of finding, evidence type, confidence, and geographic scope.",
          "resources": [
            "ipcc-synthesis",
            "noaa-climate"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Use the IPCC Atlas to compare your region across two warming levels. Cross-check one observed indicator with a public dataset.",
          "evidence": "Two exported views and a note on scale, scenario, and uncertainty.",
          "resources": [
            "ipcc-atlas",
            "owid-climate"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Build the briefing around one question that matters locally. Include a source appendix and a boundary between evidence and recommendations.",
          "evidence": "A two-page briefing or five-slide deck.",
          "resources": [
            "clean-collection",
            "noaa-climate"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Use En-ROADS to test policy combinations, then write why a simulator is a model for exploration rather than a forecast.",
          "evidence": "A sensitivity note naming at least three assumptions.",
          "resources": [
            "enroads",
            "ipcc-synthesis"
          ]
        }
      ]
    },
    {
      "id": "civics",
      "title": "Follow a public decision from rule to action",
      "deck": "Learn how law, regulation, agencies, courts, legislatures, data, and public participation connect in one real issue.",
      "focus": "public",
      "level": "Beginner",
      "weeks": 5,
      "hours": 3,
      "access": "no-account",
      "artifact": "A two-page civic process map for one local or national issue, with primary sources and a concrete participation step.",
      "prerequisites": "Choose an issue and jurisdiction. This route teaches research, not legal advice.",
      "outcomes": [
        "Distinguish constitutions, statutes, regulations, cases, policies, and guidance.",
        "Find official legislative, regulatory, and court records.",
        "Identify the institution with authority over a question.",
        "Describe a participation route without overstating its likely effect."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Use an iCivics game or quest to model one branch or process. Write down where the simulation simplifies reality.",
          "evidence": "A process sketch and a list of three simplifications.",
          "resources": [
            "icivics"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Look up unfamiliar legal terms in Wex and read the governing primary text in LII.",
          "evidence": "A glossary linked to primary authority.",
          "resources": [
            "wex",
            "cornell-lii"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Trace a bill, rulemaking docket, or Supreme Court case through its official record and timeline.",
          "evidence": "A dated timeline with primary-source links.",
          "resources": [
            "congress",
            "regulations",
            "oyez"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Map who decides, who implements, who reviews, who is affected, and where public input is accepted. Add relevant Census context.",
          "evidence": "A process map with jurisdiction and uncertainty labels.",
          "resources": [
            "census-data",
            "cornell-lii"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Check whether each statement describes law, proposed law, policy, reporting, or opinion. Verify that the participation window is current.",
          "evidence": "A corrected map and a one-paragraph limits note.",
          "resources": [
            "congress",
            "regulations"
          ]
        }
      ]
    },
    {
      "id": "health-evidence",
      "title": "Read a health claim safely",
      "deck": "Understand study designs, search authoritative indexes, compare protocols with reports, and prepare better questions for a clinician.",
      "focus": "evidence",
      "level": "Beginner",
      "weeks": 5,
      "hours": 3,
      "access": "no-account",
      "artifact": "A health-evidence brief with claim type, study design, absolute effects, limitations, conflicts, and questions for a clinician.",
      "prerequisites": "Choose a general health claim, not a personal diagnosis or treatment decision.",
      "outcomes": [
        "Evaluate who runs, funds, reviews, and updates health information.",
        "Distinguish anecdotes, observational studies, trials, and systematic reviews.",
        "Read absolute effects and reported harms.",
        "Know when online research must stop and professional care must begin."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Complete the MedlinePlus tutorial and apply its checklist to the first page making your chosen claim.",
          "evidence": "A completed checklist and a list of missing disclosures.",
          "resources": [
            "medlineplus-eval"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Use Know the Science to review study design, journal articles, risk, and health news.",
          "evidence": "A one-page study-design comparison in your own words.",
          "resources": [
            "nccih-science",
            "cdc-health-literacy"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Find the claim in PubMed, identify publication type, then compare a trial publication with its ClinicalTrials.gov record when possible.",
          "evidence": "A search log with protocol, outcome, and reporting differences.",
          "resources": [
            "pubmed",
            "clinicaltrials-basics"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Write the evidence brief. Include absolute numbers, population, duration, harms, funding, and what the studies do not answer.",
          "evidence": "A brief that avoids giving medical advice.",
          "resources": [
            "cochrane-evidence",
            "pubmed"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Ask whether the evidence is current, directly applicable, and strong enough for action. Convert uncertainties into questions for a qualified clinician.",
          "evidence": "A final section titled Questions I cannot answer online.",
          "resources": [
            "medlineplus-eval",
            "nccih-science"
          ]
        }
      ]
    },
    {
      "id": "world-history",
      "title": "Build history from primary sources",
      "deck": "Move between survey, archive, context, provenance, interpretation, and silence to create a small digital exhibit.",
      "focus": "public",
      "level": "Beginner to intermediate",
      "weeks": 6,
      "hours": 4,
      "access": "no-account",
      "artifact": "A mini digital exhibit with five primary sources, captions, provenance, a guiding question, and an interpretation note.",
      "prerequisites": "Choose a place, period, exchange, migration, technology, or idea rather than an entire civilization.",
      "outcomes": [
        "Distinguish primary sources from later interpretation.",
        "Describe provenance, audience, purpose, and archival context.",
        "Compare sources that do not tell the same story.",
        "Identify absences and limits in digitized collections."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Choose a World History Commons module and write the historical question before reading the supplied interpretation.",
          "evidence": "A question, provisional timeline, and list of source types you hope to find.",
          "resources": [
            "world-history-commons"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Read the relevant OpenStax survey sections, recording every place where the narrative compresses disagreement or uncertainty.",
          "evidence": "A context sheet with dates, actors, terms, and open questions.",
          "resources": [
            "openstax-world-history"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Collect five items from at least two archives. Record creator, date, repository, rights, description, and why it matters.",
          "evidence": "A provenance table and downloaded thumbnails or stable links.",
          "resources": [
            "loc-primary",
            "dpla-primary",
            "world-digital-library"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Arrange the sources into a digital exhibit, local document, or Smithsonian collection. Write captions that distinguish observation from inference.",
          "evidence": "A public or local exhibit with complete credits.",
          "resources": [
            "smithsonian-lab"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Search a different archive or language frame for what the first collection omitted. Revise the interpretation and add a silence note.",
          "evidence": "A paragraph on archival limits and one changed caption.",
          "resources": [
            "europeana",
            "world-history-commons"
          ]
        }
      ]
    },
    {
      "id": "language",
      "title": "Start a language through use",
      "deck": "Build structural intuition, daily contact, listening, retrieval, and a small piece of speech without pretending an app streak is fluency.",
      "focus": "foundations",
      "level": "Beginner",
      "weeks": 8,
      "hours": 3,
      "access": "no-account",
      "artifact": "A three-minute recording or live conversation, a personal phrasebook, and 30 spaced prompts drawn from real use.",
      "prerequisites": "Choose a language with a Language Transfer or comparable beginner resource and some accessible audio.",
      "outcomes": [
        "Notice recurring sound and grammar patterns.",
        "Build phrases from meaning instead of isolated word lists.",
        "Use learner-generated retrieval prompts.",
        "Review a recording to choose the next practice target."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Complete the first Language Transfer sessions. Pause, answer aloud, and write only the patterns you can explain.",
          "evidence": "A one-page pattern map and ten usable phrases.",
          "resources": [
            "language-transfer"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Use Wiktionary and Tatoeba to inspect pronunciation, inflection, and example sentences. Treat community examples as leads, not unquestionable authority.",
          "evidence": "A phrasebook with source links and corrections.",
          "resources": [
            "wiktionary",
            "tatoeba"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Shadow short audio, then retrieve phrases from meaning. Put only tested, personally useful prompts into Anki or paper cards.",
          "evidence": "Five short shadowing sessions and 30 prompts.",
          "resources": [
            "librivox",
            "easy-languages",
            "anki-manual"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Record a three-minute self-introduction, story, or explanation. For a reading route, adapt or translate a short open StoryWeaver text where licensing permits.",
          "evidence": "A dated recording or text that can be repeated later.",
          "resources": [
            "storyweaver",
            "language-transfer"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Transcribe what you actually said, mark gaps, get correction from a trusted speaker or reference, and record it again after one week.",
          "evidence": "Version two plus a list of the next five patterns to practice.",
          "resources": [
            "tatoeba",
            "wiktionary"
          ]
        }
      ]
    },
    {
      "id": "science-inquiry",
      "title": "Run a small scientific investigation",
      "deck": "Turn curiosity into a testable question, model, observation plan, data record, and replication note.",
      "focus": "science",
      "level": "Beginner",
      "weeks": 6,
      "hours": 4,
      "access": "no-account",
      "artifact": "A short investigation report with question, model, method, data, uncertainty, and a replication or parameter-change result.",
      "prerequisites": "Choose a safe question that can be explored with a simulation, public data, observation, or low-risk household materials.",
      "outcomes": [
        "Separate a question, hypothesis, model, method, observation, and conclusion.",
        "Change one variable while recording enough detail to repeat the work.",
        "Use visual and numerical representations together.",
        "Revise a model when results do not match prediction."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Explore one PhET simulation without instructions, then state a mechanism you think it represents and a question the controls can test.",
          "evidence": "A prediction and a diagram of the model.",
          "resources": [
            "phet"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Read a matching OpenStax section or MIT course note. Identify where the simulation simplifies the real system.",
          "evidence": "A concept map with assumptions and omitted factors.",
          "resources": [
            "openstax-science",
            "mit-ocw"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Follow a BioInteractive or Science Buddies investigation, preserving raw observations and changing one parameter.",
          "evidence": "A dated method and data table.",
          "resources": [
            "hhmi",
            "science-buddies"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Repeat the work independently or contribute a documented observation through a citizen-science project.",
          "evidence": "A report with data, graph, uncertainty, and enough method for another person to try.",
          "resources": [
            "zooniverse",
            "inaturalist"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Compare prediction with result, search for an alternative explanation, and run one replication or sensitivity check.",
          "evidence": "A revised model and a paragraph distinguishing correlation from cause.",
          "resources": [
            "phet",
            "hhmi"
          ]
        }
      ]
    },
    {
      "id": "family-inquiry",
      "title": "Run a family curiosity studio",
      "deck": "Pair reading, questions, observation, making, and explanation in short sessions that end with something a child can show or tell.",
      "focus": "family",
      "level": "Ages 5 to 12 with an adult",
      "weeks": 4,
      "hours": 2,
      "access": "mixed",
      "artifact": "A family curiosity portfolio with one story response, one investigation, one creative project, and one child-led explanation.",
      "prerequisites": "An adult should preview resources, choose age-appropriate material, and keep personal information out of public projects.",
      "outcomes": [
        "Turn a child’s question into a small learning sequence.",
        "Alternate screen use with talk, drawing, movement, and making.",
        "Offer accessible formats and genuine choices.",
        "Use explanation and creation as evidence of understanding."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Let the child choose a StoryWeaver book or Khan Academy Kids topic. Ask what they notice, wonder, and want to make.",
          "evidence": "A question board with the child’s words preserved.",
          "resources": [
            "storyweaver",
            "khan-kids"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Explore a Smithsonian or PBS collection together. Stop every few minutes for prediction, drawing, or retelling.",
          "evidence": "Three child-generated notes, sketches, or questions.",
          "resources": [
            "smithsonian-lab",
            "pbs-learningmedia"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Use a PhET simulation or Code.org activity, then repeat the idea away from the screen with objects, movement, or paper.",
          "evidence": "One screen activity and one physical analogue.",
          "resources": [
            "phet",
            "code-org"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Create a Scratch story, paper exhibit, model, or translated open story that answers the original question.",
          "evidence": "A project the child can explain without the adult taking over.",
          "resources": [
            "scratch",
            "storyweaver"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Ask the child to teach the idea back, choose a favorite piece, and name a next question. Use Bookshare or another accessible format where needed.",
          "evidence": "A short audio, caption, or reflection in the child’s preferred mode.",
          "resources": [
            "bookshare",
            "global-digital-library"
          ]
        }
      ]
    }
  ],
  "libraryGroups": [
    {
      "group": "Structured open study",
      "note": "Full courses and textbooks that can anchor a route, not merely decorate a bookmarks folder.",
      "ids": [
        "openlearn",
        "mit-ocw",
        "open-textbook-library",
        "libretexts",
        "oer-commons",
        "cs50x",
        "openstax-writing",
        "openintro-stats"
      ]
    },
    {
      "group": "Practice, projects, and simulations",
      "note": "Learning becomes visible when a learner must retrieve, test, build, or explain.",
      "ids": [
        "phet",
        "desmos",
        "hhmi",
        "exercism",
        "carpentries",
        "seeing-theory",
        "scratch",
        "science-buddies"
      ]
    },
    {
      "group": "Research discovery and source keeping",
      "note": "Use indexes to locate records, then read the actual source and preserve enough provenance to return.",
      "ids": [
        "doaj",
        "core",
        "openalex",
        "openalex-api",
        "crossref-search",
        "eric",
        "pubmed",
        "zotero-quickstart",
        "worldcat"
      ]
    },
    {
      "group": "Public data and evidence",
      "note": "Primary public data still requires definitions, denominator checks, and honest uncertainty.",
      "ids": [
        "our-world-in-data",
        "fred",
        "world-bank-data",
        "data-gov",
        "census-data",
        "ipcc-atlas"
      ]
    },
    {
      "group": "Civics, law, and public process",
      "note": "These sources help locate official records. They do not replace jurisdiction-specific professional advice.",
      "ids": [
        "icivics",
        "cornell-lii",
        "wex",
        "oyez",
        "congress",
        "regulations"
      ]
    },
    {
      "group": "History, museums, and archives",
      "note": "A digitized collection is a sample shaped by preservation, description, rights, language, and institutional choices.",
      "ids": [
        "world-history-commons",
        "loc-primary",
        "dpla-primary",
        "smithsonian-lab",
        "world-digital-library",
        "europeana"
      ]
    },
    {
      "group": "Health and scientific evidence",
      "note": "Use these to ask better questions. Do not use a route or database as a diagnosis or treatment recommendation.",
      "ids": [
        "medlineplus-eval",
        "nccih-science",
        "pubmed",
        "clinicaltrials-basics",
        "openwho",
        "cdc-health-literacy",
        "cochrane-evidence"
      ]
    },
    {
      "group": "Languages and accessible reading",
      "note": "Free access and open licensing are different. Eligibility rules also matter for accessible copyrighted books.",
      "ids": [
        "language-transfer",
        "tatoeba",
        "wiktionary",
        "librivox",
        "storyweaver",
        "global-digital-library",
        "bookshare"
      ]
    },
    {
      "group": "Children and family learning",
      "note": "Preview material, minimize data collection, and end sessions with talk, movement, drawing, making, or rest.",
      "ids": [
        "khan-kids",
        "pbs-learningmedia",
        "storyweaver",
        "smithsonian-lab",
        "phet",
        "code-org",
        "scratch",
        "bookshare"
      ]
    }
  ]
};

  L.curriculumDemo = DATA;

  // Repair the old safety copy at the source used by the live shelves. Lawful access,
  // provenance, and device safety are part of learning. Malware popups are not a rite of passage.
  if (L.openUniversity) {
    L.openUniversity.cautions = [
      'For lawful free access, start with public libraries, interlibrary loan, open textbooks, public-domain collections, institutional repositories, author-posted manuscripts, and publisher audit options. Avoid deceptive download buttons and sites that hide provenance or rights.',
      'Free to read is not automatically open to copy, adapt, or redistribute. Check the license on the specific item, and preserve creator, source, and license information in anything you make.',
      'Opinion, error, and uneven evidence run through educational media. Label perspective, follow citations to primary material, compare serious alternatives, and record corrections instead of treating any channel as a neutral oracle.',
      'Health, legal, safety, and financial material can support better questions, not personalized professional decisions. Stop and seek qualified help when the stakes exceed a learning exercise.',
      'Watching can orient you. Durable learning usually requires retrieval, practice, feedback, a made artifact, and delayed review.'
    ];
    const byId = Object.create(null);
    DATA.resources.forEach(function(resource){ byId[resource.id] = resource; });
    const existing = new Set();
    (L.openUniversity.beyond || []).forEach(function(group){
      (group.items || []).forEach(function(item){ existing.add(String(item.n || '').toLowerCase()); });
    });
    const extra = DATA.libraryGroups.map(function(group){
      return {
        group: group.group,
        note: group.note,
        items: group.ids.map(function(id){ return byId[id]; }).filter(Boolean).filter(function(resource){
          const key = resource.name.toLowerCase();
          if (existing.has(key)) return false;
          existing.add(key);
          return true;
        }).map(function(resource){
          return {n:resource.name,u:resource.url,note:resource.note};
        })
      };
    }).filter(function(group){ return group.items.length; });
    L.openUniversity.beyond = (L.openUniversity.beyond || []).concat(extra);
  }

  const host = document.createElement('section');
  host.className = 'curriculum-demo';
  host.id = 'study-routes';
  host.setAttribute('aria-label','Guided study routes');
  // Local change 2026-07-27: the page was restructured and the .atlas section retired, so the
  // bundled anchors no longer place this correctly. An explicit slot wins when present.
  // Re-running apply_kosplora_round.py will overwrite this file and revert this edit.
  const slot = document.getElementById('study-routes-slot');
  const atlas = document.querySelector('.atlas');
  const openUniversity = document.getElementById('openuni');
  if (slot && slot.parentNode) slot.parentNode.insertBefore(host, slot);
  else if (atlas && atlas.parentNode) atlas.parentNode.insertBefore(host, atlas);
  else if (openUniversity && openUniversity.parentNode) openUniversity.parentNode.insertBefore(host, openUniversity.nextSibling);
  else return;

  const style = document.createElement('style');
  style.textContent = `
    .curriculum-demo{margin:0 0 1.5rem;overflow:hidden}
    .cd-head{padding:1.25rem 1.25rem 0.75rem;background:linear-gradient(135deg,color-mix(in srgb, var(--accent) 10%, transparent),transparent 48%)}
    
    .cd-head h2{font-family:Georgia,"Times New Roman",serif;font-size:1.75rem;line-height:1.16;margin:0.25rem 0 0.25rem}
    .cd-head>p{max-width:46rem;color:var(--muted);margin:0.25rem 0}
    
    
    
    
    
    
    
    .cd-count{padding:0.5rem 1rem;margin:0;color:var(--muted);font-size:0.86rem}.cd-count b{color:var(--ink)}

    /* A route row is a table line, not a card. Twelve cards was 1,400px of near-identical
       blocks under a headline promising "not a list you scroll". Twelve rows is one screen,
       and the numbers align so they can actually be compared down the column. */
    /* Front matter. One place to begin, then an index. Twelve equal options behind a filter
       row gave a reader nothing to hold: no default, no grouping, no scent. */
    .cd-start{margin:1.5rem 0 0;padding:1.25rem 1.25rem 1rem;background:var(--surface);
      border-left:3px solid var(--accent);box-shadow:var(--shadow-md)}
    .cd-start-lead{margin:0 0 0.25rem;font:700 0.75rem/1.3 ui-monospace,Menlo,Consolas,monospace;
      letter-spacing:0.08em;color:var(--accent)}
    .cd-start h3{margin:0 0 0.5rem;font-family:Georgia,"Times New Roman",serif;font-size:1.75rem;
      font-weight:750;letter-spacing:-0.01em}
    .cd-start-why{margin:0 0 0.75rem;max-width:60ch;color:var(--muted)}
    .cd-start-cost{margin:0 0 1rem;max-width:60ch;font-size:0.86rem}
    .cd-start-go{font:650 0.86rem/1 inherit;padding:0.75rem 1.25rem;min-height:44px;cursor:pointer;
      border:0;border-radius:8px;background:var(--accent);color:var(--bg);box-shadow:var(--shadow-sm)}
    .cd-start-note{margin:0.75rem 0 0;font-size:0.75rem;color:var(--hint);max-width:60ch}

    .cd-index{margin:2rem 0 0}
    .cd-index h3{margin:0 0 0.25rem;font-family:Georgia,"Times New Roman",serif;font-size:1.35rem;font-weight:750}
    .cd-index-sub{margin:0 0 1rem;color:var(--muted);font-size:0.86rem;max-width:68ch}
    .cd-group{margin:0 0 1rem}
    .cd-group h4{margin:0 0 0.25rem;font:700 0.75rem/1.4 ui-monospace,Menlo,Consolas,monospace;
      letter-spacing:0.08em;color:var(--hint)}
    .cd-ix{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
    .cd-ix li{border-bottom:1px solid var(--line)}
    .cd-ix-row{display:grid;grid-template-columns:1fr auto auto;gap:0 1.25rem;align-items:baseline;
      width:100%;text-align:left;background:none;border:0;cursor:pointer;padding:0.5rem 0.25rem;min-height:44px}
    .cd-ix-row:hover,.cd-ix-row:focus-visible{background:var(--surface)}
    .cd-ix-name{font-size:1rem;font-weight:600;color:var(--ink)}
    .cd-ix-cost,.cd-ix-total{font:500 0.75rem/1.4 ui-monospace,Menlo,Consolas,monospace;
      font-variant-numeric:tabular-nums;color:var(--hint);white-space:nowrap}
    .cd-ix-total{color:var(--ink);font-weight:700;min-width:3.25rem;text-align:right}
    @media (max-width:620px){.cd-ix-row{grid-template-columns:1fr auto}.cd-ix-cost{display:none}}
    /* the full cards live below the index, reached by picking a row */
    .cd-routes{margin-top:2rem}
    .cd-count{display:none}
    .cd-route{border:0;border-top:1px solid var(--line);border-radius:0;background:none;box-shadow:none;margin:0}
    .cd-route:last-of-type{border-bottom:1px solid var(--line)}
    .cd-route>summary{display:grid;grid-template-columns:1fr auto auto auto;gap:0 1.25rem;
      align-items:baseline;padding:0.5rem 0.25rem;cursor:pointer;list-style:none;min-height:44px}
    .cd-route>summary::-webkit-details-marker{display:none}
    .cd-route>summary:hover,.cd-route>summary:focus-visible{background:var(--surface)}
    .cd-route[open]>summary{background:var(--surface)}
    .cd-r-name{font-family:Georgia,"Times New Roman",serif;font-size:1.12rem;font-weight:700}
    .cd-r-time,.cd-r-total,.cd-r-prog{font:500 0.75rem/1.4 ui-monospace,Menlo,Consolas,monospace;
      font-variant-numeric:tabular-nums;color:var(--hint);white-space:nowrap}
    .cd-r-total{color:var(--ink);font-weight:700;min-width:3.5rem;text-align:right}
    .cd-r-prog{min-width:2.5rem;text-align:right}
    .cd-r-deck{margin:0 0 0.75rem;color:var(--muted);max-width:68ch}
    @media (max-width:620px){
      .cd-route>summary{grid-template-columns:1fr auto;gap:0 0.75rem}
      .cd-r-time{grid-column:1;color:var(--hint)}
    }
    .cd-routes{display:block;gap:0}
    .cd-route,.cd-plate,.cd-fact{box-shadow:var(--shadow-md);background:var(--surface)}
    /* One level only: a stage, a tag and a resource live ON the route card, not above it. */
    .cd-route *,.cd-plate *,.cd-fact *{box-shadow:none}
    .cd-stage{box-shadow:none;border:0;border-top:1px solid var(--line)}
    
    .cd-resource{box-shadow:none}
    .cd-route[open]{box-shadow:var(--shadow-lg)}
    .cd-stage{box-shadow:var(--shadow-sm)}
    .cd-head h2{font-weight:750;letter-spacing:-0.01em}
    
    .cd-method{margin:0.75rem 0 0;font:500 0.75rem/1.5 ui-monospace,Menlo,Consolas,monospace;color:var(--hint);letter-spacing:0.04em}
    .cd-plate svg{width:100%;height:auto;display:block;overflow:visible}
    .cd-plate-tick{font-size:0.64rem;fill:var(--hint);text-anchor:middle}
    .cd-plate-axis{font-size:0.75rem;fill:var(--muted);text-anchor:middle;letter-spacing:0.04em}
    .cd-plate-mark{cursor:pointer}
    .cd-plate-mark text{font-size:0.75rem;fill:var(--ink);dominant-baseline:middle}
    .cd-plate-mark:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
    .cd-routes{display:grid;gap:0.75rem;padding:0 1rem 1rem}
    .cd-route{border:1px solid var(--line);border-radius:8px;background:var(--bg);overflow:hidden}
    .cd-route[hidden]{display:none}
    .cd-route>summary{list-style:none;cursor:pointer;padding:0.75rem 1rem;display:grid;grid-template-columns:1fr auto;gap:0.25rem 0.75rem;min-height:58px;align-items:center}
    .cd-route>summary::-webkit-details-marker{display:none}
    .cd-route>summary:hover{background:color-mix(in srgb, var(--accent) 18%, transparent)}
    
    
    
    .cd-progress progress{width:6rem;height:.45rem;accent-color:var(--accent)}
    .cd-body{border-top:1px solid var(--line);padding:1rem}
    .cd-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0.5rem 1rem;margin:0 0 0.75rem}
    .cd-fact{padding:0.5rem 0.75rem;border:1px solid var(--line);border-radius:8px;background:var(--surface)}
    .cd-fact b{display:block;color:var(--ink);font-size:0.75rem}.cd-fact span{color:var(--muted);font-size:0.75rem}
    .cd-outcomes{margin:0.25rem 0 1rem;padding-left:1.25rem;color:var(--muted);font-size:0.86rem}.cd-outcomes li{margin:0.25rem 0}
    .cd-stages{display:grid;gap:0.5rem}
    .cd-stage{border:1px solid var(--line);border-radius:8px;padding:0.75rem 0.75rem;background:var(--surface)}
    .cd-stage-head{display:flex;gap:0.75rem;align-items:flex-start}.cd-stage-head label{display:flex;gap:0.5rem;align-items:flex-start;cursor:pointer;flex:1}
    .cd-stage-head input{width:1.15rem;height:1.15rem;margin-top:0.25rem;accent-color:var(--accent)}
    .cd-stage-name{font:700 .7rem/1.3 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.1em;color:var(--accent)}
    .cd-stage-task{display:block;color:var(--ink);font-size:0.86rem;line-height:1.45;margin-top:0.25rem}
    .cd-evidence{margin:0.5rem 0;color:var(--muted);font-size:0.75rem}.cd-evidence b{color:var(--ink)}
    .cd-resources{list-style:none;margin:0.5rem 0 0;padding:0;display:grid;gap:0.5rem}
    .cd-resource{padding:0.5rem 0;border-top:1px solid var(--line)}
    .cd-resource:first-child{border-top:none}.cd-resource a{color:var(--ink);font-weight:650;text-decoration:none}.cd-resource a:hover{text-decoration:underline;color:var(--accent)}
    .cd-provider{color:var(--ochre);font-size:0.75rem}.cd-resource p{margin:0.25rem 0;color:var(--muted);font-size:0.75rem;line-height:1.4}
    .cd-tags{display:flex;flex-wrap:wrap;gap:0.25rem;margin-top:0.25rem}/* 525 outlined pills, nested five and six boxes deep, was a chip wall: the first tell on the
       house anti-slop list, shipped while the type scale was being measured. Metadata is not a
       button and does not need a border to be read. Plain text, separated, in the source ink. */
    .cd-tag{border:0;border-radius:0;padding:0;color:var(--hint);font:500 0.64rem/1.4 ui-monospace,Menlo,Consolas,monospace}
    .cd-tags{display:flex;flex-wrap:wrap;gap:0 0.75rem;margin-top:0.25rem}
    .cd-tags .cd-tag+.cd-tag{position:relative;padding-left:0.75rem}
    .cd-tags .cd-tag+.cd-tag::before{content:" b7";position:absolute;left:0;color:var(--line)}
    .cd-tag.open{color:var(--bd-hi-fg);background:var(--bd-hi-bg)}
    .cd-actions{display:flex;justify-content:space-between;gap:0.75rem;align-items:center;margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--line)}
    .cd-reset{min-height:44px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--muted);padding:0.5rem 0.75rem;cursor:pointer}.cd-reset:hover{color:var(--ink);border-color:var(--accent)}
    .cd-local{color:var(--hint);font-size:0.75rem}.cd-empty{padding:1rem;color:var(--muted);border:1px dashed var(--line);border-radius:8px}
    .cd-note{padding:0.75rem 1rem;border-top:1px solid var(--line);color:var(--hint);font-size:0.75rem;margin:0}
    @media(max-width:680px){.cd-route>summary{grid-template-columns:1fr}.cd-facts{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const RES = Object.create(null);
  DATA.resources.forEach(function(resource){ RES[resource.id] = resource; });
  const KEY = 'kosplora.curriculum.progress.v1';
  let progress = readStore();
  let search = '';
  let hours = 'all';
  let access = 'all';
  let focus = 'all';

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }
  function readStore(){
    try { const value = JSON.parse(localStorage.getItem(KEY) || '{}'); return value && typeof value === 'object' ? value : {}; }
    catch (_) { return {}; }
  }
  function writeStore(){ try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (_) {} }
  function stepKey(route,stage){ return route.id + ':' + stage.id; }
  function completed(route){ return route.stages.filter(function(stage){ return !!progress[stepKey(route,stage)]; }).length; }
  function resourceTags(resource){
    const tags = [resource.format, resource.access === 'open' ? 'open license' : resource.access === 'free' ? 'free access' : 'access limits'];
    if (resource.account === 'none') tags.push('no account');
    else if (resource.account === 'optional') tags.push('account optional');
    else if (resource.account === 'eligibility') tags.push('eligibility rule');
    else tags.push('account needed');
    if (resource.bandwidth === 'low') tags.push('low bandwidth');
    if (resource.download) tags.push('downloadable');
    return tags;
  }
  function resourceHTML(id){
    const r = RES[id];
    if (!r) return '';
    return '<li class="cd-resource"><a href="'+esc(r.url)+'" target="_blank" rel="noopener">'+esc(r.name)+'</a> <span class="cd-provider">'+esc(r.provider)+'</span>'+
      '<p>'+esc(r.note)+'</p><div class="cd-tags">'+resourceTags(r).map(function(tag){ return '<span class="cd-tag'+(tag==='open license'?' open':'')+'">'+esc(tag)+'</span>'; }).join('')+'</div></li>';
  }
  function stageHTML(route,stage){
    const key = stepKey(route,stage), checked = !!progress[key];
    return '<section class="cd-stage"><div class="cd-stage-head"><label><input type="checkbox" data-cd-step="'+esc(key)+'" '+(checked?'checked':'')+'><span><span class="cd-stage-name">'+esc(stage.label)+'</span><span class="cd-stage-task">'+esc(stage.task)+'</span></span></label></div>'+
      '<p class="cd-evidence"><b>Evidence of progress:</b> '+esc(stage.evidence)+'</p><ul class="cd-resources">'+stage.resources.map(resourceHTML).join('')+'</ul></section>';
  }

  function routeHTML(route){
    const done = completed(route), percent = Math.round(done / route.stages.length * 100);
    return '<details class="cd-route" data-route="'+esc(route.id)+'" data-hours="'+route.hours+'" data-access="'+esc(route.access)+'" data-focus="'+esc(route.focus)+'">'+
      '<summary>'+
      '<span class="cd-r-name">'+esc(route.title)+'</span>'+
      '<span class="cd-r-time">'+route.weeks+'w · '+route.hours+'h/wk</span>'+
      '<span class="cd-r-total">'+(route.weeks*route.hours)+'h</span>'+
      '<span class="cd-r-prog">'+done+'/5</span>'+
      '</summary>'+
      '<div class="cd-body"><p class="cd-r-deck">'+esc(route.deck)+'</p><div class="cd-facts"><div class="cd-fact"><b>Start with</b><span>'+esc(route.prerequisites)+'</span></div><div class="cd-fact"><b>Finish with</b><span>'+esc(route.artifact)+'</span></div></div>'+
      '<div class="cd-stage-name">What you will be able to do</div><ul class="cd-outcomes">'+route.outcomes.map(function(item){return '<li>'+esc(item)+'</li>';}).join('')+'</ul>'+
      '<div class="cd-stages">'+route.stages.map(function(stage){return stageHTML(route,stage);}).join('')+'</div>'+
      '<div class="cd-actions"><span class="cd-local">'+percent+'% complete · stored only in this browser</span><button type="button" class="cd-reset" data-cd-reset="'+esc(route.id)+'">Reset this route</button></div></div></details>';
  }
  function optionHTML(value,label,current){
    return '<option value="'+esc(value)+'"'+(value===current?' selected':'')+'>'+esc(label)+'</option>';
  }
  function focusOptions(){
    const labels = {all:'All routes',foundations:'Foundations',evidence:'Evidence literacy',build:'Build something',public:'Public life',science:'Science',family:'Family'};
    return Object.keys(labels).map(function(id){return optionHTML(id,labels[id],focus);}).join('');
  }
  // Rebuilt 2026-07-28 from the information architecture rather than the styling. The page was
  // twelve equal options behind a filter row, which is a stall by Hick's law and carries no
  // information scent: nothing told a reader where to begin or what was here. Now it reads as
  // front matter: what this is, one route to start with and why, then a grouped index of the
  // rest. Diataxis separates the layers that were previously stacked flat: these routes are
  // tutorials, the shelves below are reference, the ranker is the explanation of the method.
  const FOCUS_ORDER = ['foundations','evidence','science','public','build','family'];
  const FOCUS_LABEL = {foundations:'Foundations',evidence:'Evidence literacy',science:'Science',
                       public:'Public life',build:'Build something',family:'Family'};
  const START_ID = 'learn-how';

  function startHTML(){
    const r = DATA.routes.find(function(x){ return x.id === START_ID; }) || DATA.routes[0];
    if (!r) return '';
    return '<section class="cd-start" aria-labelledby="cd-start-h">'
      + '<p class="cd-start-lead">Start here</p>'
      + '<h3 id="cd-start-h">' + esc(r.title) + '</h3>'
      + '<p class="cd-start-why">' + esc(r.deck) + '</p>'
      + '<p class="cd-start-cost"><b>' + r.weeks + ' weeks</b> at about ' + r.hours
      + ' hours a week. You finish with ' + esc(r.artifact.charAt(0).toLowerCase() + r.artifact.slice(1)) + '</p>'
      + '<button type="button" class="cd-start-go" data-goto="' + esc(r.id) + '">Open this route</button>'
      + '<p class="cd-start-note">It is the shortest route here, and the method it teaches is the one every other route uses.</p>'
      + '</section>';
  }

  function indexHTML(){
    const groups = FOCUS_ORDER
      .map(function(f){ return {f: f, rows: DATA.routes.filter(function(r){ return r.focus === f; })}; })
      .filter(function(g){ return g.rows.length; });
    return '<section class="cd-index" aria-labelledby="cd-index-h">'
      + '<h3 id="cd-index-h">Every route</h3>'
      + '<p class="cd-index-sub">Twelve routes, each ending in something another person can look at. '
      + 'Weeks and hours are what the route asks of you.</p>'
      + groups.map(function(g){
          return '<div class="cd-group"><h4>' + esc(FOCUS_LABEL[g.f] || g.f) + '</h4>'
            + '<ul class="cd-ix">' + g.rows.map(function(r){
                return '<li><button type="button" class="cd-ix-row" data-goto="' + esc(r.id) + '">'
                  + '<span class="cd-ix-name">' + esc(r.title) + '</span>'
                  + '<span class="cd-ix-cost">' + r.weeks + 'w &middot; ' + r.hours + 'h/wk</span>'
                  + '<span class="cd-ix-total">' + (r.weeks * r.hours) + 'h</span>'
                  + '</button></li>';
              }).join('') + '</ul></div>';
        }).join('')
      + '</section>';
  }

  function shellHTML(){
    return '<header class="cd-head"><h2>' + esc(DATA.title) + '</h2>'
      + '<p>' + esc(DATA.dek) + '</p>'
      + '<p class="cd-method">' + DATA.method.sequence.join(' → ') + '</p></header>'
      + startHTML() + indexHTML()
      + '<div class="cd-count" id="cd-count"></div>'
      + '<div class="cd-routes" id="cd-routes">' + DATA.routes.map(routeHTML).join('') + '</div>'
      + '<p class="cd-note"><b>Evidence boundary:</b> ' + esc(DATA.method.reads) + ' '
      + esc(DATA.method.access) + ' ' + esc(DATA.method.safety) + '</p>';
  }
  host.innerHTML = shellHTML();

  // Both the start button and every index row are ways in, so one handler serves them.
  function gotoRoute(ids){
    const list = String(ids).split(',');
    let first = null;
    list.forEach(function(id){
      const card = host.querySelector('.cd-route[data-route="' + id + '"]');
      if (!card) return;
      card.hidden = false; card.open = true;
      if (!first) first = card;
    });
    if (!first) return;
    first.scrollIntoView({block:'start'});
    const sum = first.querySelector('summary'); if (sum) sum.focus();
  }
  host.addEventListener('click', function(e){
    const go = e.target.closest && e.target.closest('[data-goto]');
    if (go) { e.preventDefault(); gotoRoute(go.getAttribute('data-goto')); }
  });


  function haystack(route){
    const ids = [];
    route.stages.forEach(function(stage){ stage.resources.forEach(function(id){ ids.push(id); }); });
    return [route.title,route.deck,route.artifact,route.prerequisites].concat(route.outcomes).concat(ids.map(function(id){ const r=RES[id]; return r ? [r.name,r.provider,r.note,r.format].join(' ') : ''; })).join(' ').toLowerCase();
  }
  function renderFilter(){
    let shown = 0;
    DATA.routes.forEach(function(route){
      const element = host.querySelector('[data-route="'+route.id+'"]');
      const okSearch = !search || haystack(route).indexOf(search) >= 0;
      const okHours = hours === 'all' || route.hours <= Number(hours);
      const okFocus = focus === 'all' || route.focus === focus;
      const okAccess = access === 'all' || route.access === access;
      const visible = okSearch && okHours && okFocus && okAccess;
      element.hidden = !visible;
      if (visible) shown++;
    });
    const count = document.getElementById('cd-count');
    if (count) count.innerHTML = 'Showing <b>'+shown+'</b> of '+DATA.routes.length+' routes · '+DATA.resources.length+' source-checked resources in the demonstration.';
    const routesHost = document.getElementById('cd-routes');
    let empty = routesHost.querySelector('.cd-empty');
    if (!shown && !empty) { empty = document.createElement('p'); empty.className='cd-empty'; empty.textContent='No route matches those filters. Clear the search or allow more weekly time.'; routesHost.appendChild(empty); }
    if (shown && empty) empty.remove();
  }
  host.addEventListener('input',function(event){
    if (event.target.id === 'cd-search') { search = event.target.value.trim().toLowerCase(); renderFilter(); return; }
    if (event.target.id === 'cd-hours') { hours = event.target.value; renderFilter(); return; }
    if (event.target.id === 'cd-focus') { focus = event.target.value; renderFilter(); return; }
    if (event.target.id === 'cd-access') { access = event.target.value; renderFilter(); return; }
    if (event.target.matches('[data-cd-step]')) {
      progress[event.target.dataset.cdStep] = event.target.checked;
      writeStore();
      const route = event.target.closest('.cd-route');
      const open = route && route.open;
      host.innerHTML = shellHTML();
      if (open) { const again = host.querySelector('[data-route="'+route.dataset.route+'"]'); if (again) again.open = true; }
      renderFilter();
    }
  });
  host.addEventListener('click',function(event){
    const button = event.target.closest('[data-cd-reset]');
    if (!button) return;
    const id = button.dataset.cdReset;
    Object.keys(progress).forEach(function(key){ if (key.indexOf(id+':') === 0) delete progress[key]; });
    writeStore();
    host.innerHTML = shellHTML();
    const route = host.querySelector('[data-route="'+id+'"]'); if (route) route.open = true;
    renderFilter();
  });
  renderFilter();
})(window);
