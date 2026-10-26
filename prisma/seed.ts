import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ============ Default User Profile ============
  const profile = await prisma.userProfile.upsert({
    where: { email: "amit@jobradar.local" },
    update: {
      name: "Amit",
      degree: "B.Tech in Computer Science and Engineering",
      graduationYear: 2027,
      currentRole: "Associate Software Engineer Intern",
      currentCompany: "ServiceNow",
      targetRoles: [
        "Intern",
        "Software Engineer Intern",
        "Software Engineer",
        "Software Development Engineer",
        "Associate Software Engineer",
        "Graduate Engineer Trainee",
        "New Grad Engineer",
        "Graduate Software Engineer",
        "Fresher",
        "Backend Engineer",
        "Full-Stack Engineer",
        "Platform Engineer",
        "Cloud Engineer",
        "DevOps Engineer",
      ],
      employmentTypes: ["INTERNSHIP", "FULL_TIME"],
      skills: [
        "ServiceNow", "C", "C++", "Java", "Python", "JavaScript", "TypeScript",
        "React", "Next.js", "Node.js", "Express", "Spring Boot",
        "SQL", "PostgreSQL", "MongoDB", "Prisma",
        "Git", "GitHub", "Docker",
        "REST APIs", "Microservices", "Distributed Systems",
      ],
      minExperience: 0,
      maxExperience: 1,
      locations: ["India", "Remote"],
    },
    create: {
      name: "Amit",
      email: "amit@jobradar.local",
      degree: "B.Tech in Computer Science and Engineering",
      graduationYear: 2027,
      currentRole: "Associate Software Engineer Intern",
      currentCompany: "ServiceNow",
      targetRoles: [
        "Intern",
        "Software Engineer Intern",
        "Software Engineer",
        "Software Development Engineer",
        "Associate Software Engineer",
        "Graduate Engineer Trainee",
        "New Grad Engineer",
        "Graduate Software Engineer",
        "Fresher",
        "Backend Engineer",
        "Full-Stack Engineer",
        "Platform Engineer",
        "Cloud Engineer",
        "DevOps Engineer",
      ],
      employmentTypes: ["INTERNSHIP", "FULL_TIME"],
      skills: [
        "ServiceNow", "C", "C++", "Java", "Python", "JavaScript", "TypeScript",
        "React", "Next.js", "Node.js", "Express", "Spring Boot",
        "SQL", "PostgreSQL", "MongoDB", "Prisma",
        "Git", "GitHub", "Docker",
        "REST APIs", "Microservices", "Distributed Systems",
      ],
      minExperience: 0,
      maxExperience: 1,
      locations: ["India", "Remote"],
    },
  });

  console.log(`✅ Profile created: ${profile.name}`);

  // ============ Company Registry ============
  // Each entry: [name, slug, careersUrl, atsType, atsBoardId, priority, notes]

  type CompanyEntry = [
    string,
    string,
    string,
    "GREENHOUSE" | "LEVER" | "ASHBY" | "WORKDAY" | "CUSTOM" | "NONE",
    string | null,
    number,
    string | null
  ];

  const companies: CompanyEntry[] = [
    // === Product & Technology - Verified Greenhouse Boards ===
    ["Cloudflare", "cloudflare", "https://www.cloudflare.com/careers/", "GREENHOUSE", "cloudflare", 1, null],
    ["Figma", "figma", "https://www.figma.com/careers/", "GREENHOUSE", "figma", 1, null],
    ["Twilio", "twilio", "https://www.twilio.com/en-us/company/jobs", "GREENHOUSE", "twilio", 2, null],
    ["MongoDB", "mongodb", "https://www.mongodb.com/careers", "GREENHOUSE", "mongodb", 1, null],
    ["Databricks", "databricks", "https://www.databricks.com/company/careers", "GREENHOUSE", "databricks", 1, null],
    ["Rubrik", "rubrik", "https://www.rubrik.com/company/careers", "GREENHOUSE", "rubrik", 1, null],
    ["HackerRank", "hackerrank", "https://job-boards.greenhouse.io/hackerrank", "GREENHOUSE", "hackerrank", 1, null],
    ["Enterpret", "enterpret", "https://job-boards.greenhouse.io/enterpret", "GREENHOUSE", "enterpret", 1, null],
    ["Coinbase", "coinbase", "https://www.coinbase.com/careers", "GREENHOUSE", "coinbase", 2, null],
    ["Stripe", "stripe", "https://stripe.com/jobs", "GREENHOUSE", "stripe", 1, null],
    ["Dropbox", "dropbox", "https://www.dropbox.com/jobs", "GREENHOUSE", "dropbox", 2, null],
    ["Elastic", "elastic", "https://www.elastic.co/careers", "GREENHOUSE", "elastic", 2, null],
    ["InMobi", "inmobi", "https://www.inmobi.com/company/careers", "GREENHOUSE", "inmobi", 1, null],
    ["Groww", "groww", "https://groww.in/careers", "GREENHOUSE", "groww", 1, null],

    // === Product & Technology - Verified Lever Boards ===
    ["Hevo Data", "hevo-data", "https://jobs.lever.co/hevodata", "LEVER", "hevodata", 1, null],
    ["Merkle Science", "merkle-science", "https://jobs.lever.co/merklescience", "LEVER", "merklescience", 1, null],
    ["CRED", "cred", "https://careers.cred.club/", "LEVER", "cred", 1, null],
    ["Meesho", "meesho", "https://meesho.io/careers", "LEVER", "meesho", 1, null],

    // === Product & Technology - Official Careers Link (Custom / Enterprise ATS) ===
    ["Postman", "postman", "https://www.postman.com/company/careers/", "CUSTOM", null, 1, "Custom ATS"],
    ["Confluent", "confluent", "https://www.confluent.io/careers/", "CUSTOM", null, 2, "Custom ATS"],
    ["Snowflake", "snowflake", "https://careers.snowflake.com/", "ASHBY", "snowflake", 1, null],
    ["CrowdStrike", "crowdstrike", "https://www.crowdstrike.com/careers/", "WORKDAY", "crowdstrike:wd5:crowdstrikecareers", 2, "Workday CXS"],
    ["Palantir", "palantir", "https://www.palantir.com/careers/", "CUSTOM", "palantir", 1, "SmartRecruiters ATS"],
    ["Plaid", "plaid", "https://plaid.com/careers/", "ASHBY", "plaid", 2, null],
    ["Rippling", "rippling", "https://www.rippling.com/careers", "CUSTOM", null, 2, "Custom ATS"],
    ["Canva", "canva", "https://www.canva.com/careers/", "CUSTOM", "canva", 1, "SmartRecruiters ATS"],
    ["UiPath", "uipath", "https://www.uipath.com/company/careers", "ASHBY", "uipath", 2, null],
    ["BrowserStack", "browserstack", "https://www.browserstack.com/careers", "CUSTOM", null, 1, "Custom ATS"],
    ["Freshworks", "freshworks", "https://www.freshworks.com/careers/", "CUSTOM", "freshworks", 1, "SmartRecruiters ATS"],
    ["Okta", "okta", "https://www.okta.com/company/careers/", "GREENHOUSE", "okta", 2, null],
    ["Nutanix", "nutanix", "https://www.nutanix.com/careers", "CUSTOM", null, 2, "Custom ATS"],
    ["Brex", "brex", "https://www.brex.com/careers", "GREENHOUSE", "brex", 2, null],
    ["Chargebee", "chargebee", "https://www.chargebee.com/careers/", "CUSTOM", null, 2, "Custom ATS"],
    ["Autodesk", "autodesk", "https://www.autodesk.com/careers", "WORKDAY", "autodesk:wd1:Ext", 2, "Workday CXS"],
    ["Razorpay", "razorpay", "https://razorpay.com/jobs/", "CUSTOM", null, 1, "Custom ATS"],

    // === Product & Technology - Custom/None (careers link only) ===
    ["ServiceNow", "servicenow", "https://www.servicenow.com/careers.html", "CUSTOM", "servicenow", 1, "SmartRecruiters ATS"],
    ["Atlassian", "atlassian", "https://www.atlassian.com/company/careers", "CUSTOM", null, 1, "Custom ATS"],
    ["Salesforce", "salesforce", "https://careers.salesforce.com/", "CUSTOM", null, 1, "Custom ATS"],
    ["Adobe", "adobe", "https://www.adobe.com/careers.html", "WORKDAY", "adobe:wd5:external_experienced", 1, "Workday CXS"],
    ["Microsoft", "microsoft", "https://careers.microsoft.com/", "CUSTOM", null, 1, "Custom ATS"],
    ["Google", "google", "https://www.google.com/about/careers/", "CUSTOM", null, 1, "Custom ATS"],
    ["Amazon", "amazon", "https://www.amazon.jobs/", "CUSTOM", "amazon-jobs", 1, "Direct Amazon Jobs API"],
    ["Apple", "apple", "https://www.apple.com/careers/", "CUSTOM", null, 1, "Custom ATS"],
    ["NVIDIA", "nvidia", "https://www.nvidia.com/en-us/about-nvidia/careers/", "WORKDAY", "nvidia:wd5:NVIDIAExternalCareerSite", 1, "Workday CXS"],
    ["AMD", "amd", "https://www.amd.com/en/corporate/careers.html", "CUSTOM", null, 2, "Custom ATS"],
    ["Qualcomm", "qualcomm", "https://www.qualcomm.com/company/careers", "CUSTOM", null, 2, "Custom ATS"],
    ["SAP", "sap", "https://www.sap.com/about/careers.html", "CUSTOM", null, 2, "SuccessFactors"],
    ["Oracle", "oracle", "https://www.oracle.com/careers/", "CUSTOM", null, 2, "Custom ATS"],
    ["IBM", "ibm", "https://www.ibm.com/careers", "CUSTOM", null, 2, "Custom ATS"],
    ["Cisco", "cisco", "https://jobs.cisco.com/", "CUSTOM", null, 2, "Custom ATS"],
    ["Broadcom", "broadcom", "https://www.broadcom.com/company/careers", "CUSTOM", null, 2, "Includes VMware"],
    ["Dell Technologies", "dell", "https://jobs.dell.com/", "CUSTOM", null, 2, "Custom ATS"],
    ["Walmart Global Tech", "walmart-global-tech", "https://tech.walmart.com/careers", "CUSTOM", null, 2, "Custom ATS"],
    ["Uber", "uber", "https://www.uber.com/us/en/careers/", "CUSTOM", "uber", 1, "SmartRecruiters ATS"],
    ["Airbnb", "airbnb", "https://careers.airbnb.com/", "GREENHOUSE", "airbnb", 1, null],
    ["Workday", "workday", "https://www.workday.com/en-us/company/careers.html", "CUSTOM", null, 2, "Custom ATS"],
    ["Intuit", "intuit", "https://www.intuit.com/careers/", "CUSTOM", null, 2, "Custom ATS"],
    ["Target", "target", "https://corporate.target.com/careers", "CUSTOM", null, 3, "Custom ATS"],

    // === Indian Product/Fintech/Consumer Tech ===
    ["Flipkart", "flipkart", "https://www.flipkartcareers.com/", "CUSTOM", null, 1, "Custom ATS"],
    ["PhonePe", "phonepe", "https://www.phonepe.com/careers/", "CUSTOM", null, 1, "Custom ATS"],
    ["Paytm", "paytm", "https://jobs.paytm.com/", "CUSTOM", null, 2, "Custom ATS"],
    ["Groww", "groww", "https://groww.in/careers", "CUSTOM", null, 1, null],
    ["Juspay", "juspay", "https://juspay.in/careers", "CUSTOM", null, 1, null],
    ["Zomato", "zomato", "https://www.zomato.com/careers", "CUSTOM", null, 1, null],
    ["Swiggy", "swiggy", "https://careers.swiggy.com/", "CUSTOM", "swiggy", 1, "SmartRecruiters ATS"],
    ["Zepto", "zepto", "https://www.zeptonow.com/careers", "LEVER", "zeptonow", 1, null],
    ["Blinkit", "blinkit", "https://blinkit.com/careers", "CUSTOM", null, 2, "Part of Zomato"],
    ["MakeMyTrip", "makemytrip", "https://careers.makemytrip.com/", "CUSTOM", null, 2, null],
    ["Dream11", "dream11", "https://www.dreamsports.group/careers", "CUSTOM", null, 1, null],
    ["InMobi", "inmobi", "https://www.inmobi.com/company/careers", "GREENHOUSE", "inmobi", 1, null],
    ["Zoho", "zoho", "https://www.zoho.com/careers.html", "CUSTOM", null, 2, "Custom ATS"],

    // === Banking/Finance/Trading ===
    ["Goldman Sachs", "goldman-sachs", "https://www.goldmansachs.com/careers/", "CUSTOM", null, 1, "Custom ATS"],
    ["Morgan Stanley", "morgan-stanley", "https://www.morganstanley.com/careers", "CUSTOM", null, 1, "Custom ATS"],
    ["JPMorgan Chase", "jpmorgan", "https://careers.jpmorgan.com/", "CUSTOM", null, 1, "Custom ATS"],
    ["American Express", "amex", "https://www.americanexpress.com/en-us/careers/", "CUSTOM", null, 2, "Custom ATS"],
    ["HSBC", "hsbc", "https://www.hsbc.com/careers", "CUSTOM", null, 2, "Custom ATS"],
    ["BlackRock", "blackrock", "https://careers.blackrock.com/", "CUSTOM", null, 2, "Custom ATS"],
    ["Barclays", "barclays", "https://search.jobs.barclays/", "CUSTOM", null, 2, "Custom ATS"],
    ["Deutsche Bank", "deutsche-bank", "https://careers.db.com/", "CUSTOM", null, 2, "Custom ATS"],
    ["Fidelity", "fidelity", "https://jobs.fidelity.com/", "CUSTOM", null, 2, "Custom ATS"],
    ["Wells Fargo", "wells-fargo", "https://www.wellsfargojobs.com/", "CUSTOM", null, 3, "Custom ATS"],

    // === Engineering Services/Consulting ===
    ["Thoughtworks", "thoughtworks", "https://www.thoughtworks.com/careers", "GREENHOUSE", "thoughtworks", 2, null],
    ["EPAM Systems", "epam", "https://www.epam.com/careers", "CUSTOM", null, 3, null],
    ["LTIMindtree", "ltimindtree", "https://www.ltimindtree.com/careers/", "CUSTOM", null, 3, null],
    ["Publicis Sapient", "publicis-sapient", "https://www.publicissapient.com/careers", "CUSTOM", null, 3, null],
    ["Persistent Systems", "persistent", "https://www.persistent.com/careers/", "CUSTOM", null, 3, null],
    ["Accenture", "accenture", "https://www.accenture.com/in-en/careers", "CUSTOM", null, 3, null],
    ["Deloitte", "deloitte", "https://www2.deloitte.com/global/en/careers.html", "CUSTOM", null, 3, null],
    ["Nagarro", "nagarro", "https://www.nagarro.com/en/careers", "CUSTOM", null, 3, null],
    ["ZS", "zs", "https://www.zs.com/careers", "CUSTOM", null, 3, null],
  ];

  for (const [name, slug, careersUrl, atsType, atsBoardId, priority, notes] of companies) {
    await prisma.company.upsert({
      where: { slug },
      update: { name, careersUrl, atsType, atsBoardId, priority, notes },
      create: {
        name,
        slug,
        careersUrl,
        atsType,
        atsBoardId: atsBoardId ?? undefined,
        isActive: true,
        priority,
        notes,
      },
    });
  }

  console.log(`✅ ${companies.length} companies seeded`);

  // Create JobSource entries for companies with working ATS integrations
  const greenhouseCompanies = await prisma.company.findMany({
    where: { atsType: "GREENHOUSE", atsBoardId: { not: null } },
  });

  for (const company of greenhouseCompanies) {
    await prisma.jobSource.upsert({
      where: {
        id: `src-${company.slug}`,
      },
      update: {},
      create: {
        id: `src-${company.slug}`,
        companyId: company.id,
        sourceType: "GREENHOUSE",
        sourceUrl: `https://boards-api.greenhouse.io/v1/boards/${company.atsBoardId}/jobs`,
        boardIdentifier: company.atsBoardId,
        isActive: true,
      },
    });
  }

  const leverCompanies = await prisma.company.findMany({
    where: { atsType: "LEVER", atsBoardId: { not: null } },
  });

  for (const company of leverCompanies) {
    await prisma.jobSource.upsert({
      where: {
        id: `src-${company.slug}`,
      },
      update: {},
      create: {
        id: `src-${company.slug}`,
        companyId: company.id,
        sourceType: "LEVER",
        sourceUrl: `https://api.lever.co/v0/postings/${company.atsBoardId}`,
        boardIdentifier: company.atsBoardId,
        isActive: true,
      },
    });
  }

  console.log(`✅ ${greenhouseCompanies.length + leverCompanies.length} job sources created`);
  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
