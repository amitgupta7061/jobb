import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jobFiltersSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parseResult = jobFiltersSchema.safeParse(searchParams);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid query parameters", details: parseResult.error.format() }, { status: 400 });
    }

    const {
      search,
      company,
      employmentType,
      matchCategory,
      listingStatus = "OPEN",
      isRemote,
      locationScope = "india_or_remote",
      includeIneligible = false,
      roleLevel = "intern_or_fresher",
      minScore,
      sortBy = "score",
      sortOrder = "desc",
      page = 1,
      pageSize = 20,
    } = parseResult.data;

    const skip = (page - 1) * pageSize;

    // Build Prisma where conditions — default to open intern/fresher jobs in India or remote
    const where: any = {
      listingStatus,
    };

    if (search) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { company: { name: { contains: search, mode: "insensitive" } } },
        ],
      });
    }

    if (company) {
      where.company = { slug: company };
    }

    if (employmentType) {
      where.employmentType = employmentType;
    }

    if (isRemote !== undefined) {
      where.isRemote = isRemote;
    }

    const INDIA_CITIES = [
      "India", "Bengaluru", "Bangalore", "Hyderabad", "Pune",
      "Gurugram", "Gurgaon", "Noida", "Mumbai", "Delhi", "New Delhi",
      "Chennai", "Kolkata", "Ahmedabad", "Chandigarh", "Jaipur",
      "Kochi", "Coimbatore", "Trivandrum", "Indore",
    ];

    // Senior / Mid-level titles that a 0-1 YOE fresher / intern must NEVER see
    const EXCLUDED_SENIOR_TERMS = [
      "Senior", "Sr.", "Staff", "Principal", "Lead", "Manager", "Director", "Head", "VP", "Vice President",
      "Architect", "Distinguished", "Fellow", "L2", "L3", "L4", "L5", "L6", "P2", "P3", "P4", "P5",
      "IC2", "IC3", "IC4", "IC5", "SDE 2", "SDE 3", "SDE II", "SDE III", "SWE 2", "SWE 3", "SWE II", "SWE III",
      "Engineer 2", "Engineer II", "Engineer 3", "Engineer III", "Auditor", "Specialist", "Account Executive",
      "Recruiter", "Sales", "Legal", "Marketing", "Customer Experience", "Customer Support", "Support Engineer",
    ];

    where.AND = where.AND || [];

    // 1. Strict Senior/Experienced Title Exclusion
    if (roleLevel !== "all") {
      where.AND.push({
        NOT: EXCLUDED_SENIOR_TERMS.map((kw) => ({
          title: { contains: kw, mode: "insensitive" },
        })),
      });
    }

    // 2. Strict Location Scope: India onsite/hybrid OR Remote
    if (locationScope === "remote") {
      where.isRemote = true;
    } else if (locationScope === "india") {
      where.AND.push({
        OR: [
          { locations: { hasSome: INDIA_CITIES } },
          ...INDIA_CITIES.map((city) => ({
            title: { contains: city, mode: "insensitive" as const },
          })),
          ...INDIA_CITIES.map((city) => ({
            locations: { has: `Onsite in ${city}` },
          })),
        ],
      });
    } else if (locationScope === "india_or_remote") {
      where.AND.push({
        OR: [
          { locations: { hasSome: INDIA_CITIES } },
          { isRemote: true },
          { remoteRestrictions: { contains: "India", mode: "insensitive" } },
          ...INDIA_CITIES.map((city) => ({
            title: { contains: city, mode: "insensitive" as const },
          })),
          ...INDIA_CITIES.map((city) => ({
            locations: { has: `Onsite in ${city}` },
          })),
        ],
      });
    }

    if (locationScope !== "all") {
      // Reject foreign remote/onsite explicitly pinned to non-India locations
      const FOREIGN_COUNTRIES = [
        "Remote - US", "Remote - Ireland", "Remote - Canada", "Remote - UK", "Remote - Germany",
        "United States", "Ireland", "Canada", "United Kingdom", "Germany", "Australia",
      ];
      where.AND.push({
        NOT: FOREIGN_COUNTRIES.map((fc) => ({
          locations: { has: fc },
        })),
      });
    }

    if (!employmentType && roleLevel === "intern") {
      where.employmentType = "INTERNSHIP";
    } else if (!employmentType && roleLevel === "fresher") {
      where.employmentType = { not: "INTERNSHIP" };
    }

    const hideIneligible = !includeIneligible && matchCategory !== "INELIGIBLE" && locationScope !== "all";

    if (matchCategory || minScore !== undefined || hideIneligible) {
      where.match = {
        ...(where.match || {}),
        ...(matchCategory
          ? { matchCategory }
          : hideIneligible
            ? { matchCategory: { not: "INELIGIBLE" } }
            : {}),
        ...(minScore !== undefined ? { overallScore: { gte: minScore } } : {}),
      };
    }

    // Determine ordering
    let orderBy: any = {};
    if (sortBy === "score") {
      orderBy = { match: { overallScore: sortOrder } };
    } else if (sortBy === "newest") {
      orderBy = { firstSeenAt: sortOrder };
    } else if (sortBy === "company") {
      orderBy = { company: { name: sortOrder } };
    } else if (sortBy === "title") {
      orderBy = { title: sortOrder };
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          company: true,
          match: true,
          savedJobs: { select: { id: true } },
          applications: { select: { id: true, status: true } },
        },
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.job.count({ where }),
    ]);

    const formattedJobs = jobs.map((job) => ({
      ...job,
      isSaved: job.savedJobs.length > 0,
      applicationStatus: job.applications[0]?.status || null,
      savedJobs: undefined,
      applications: undefined,
    }));

    return NextResponse.json({
      data: formattedJobs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: any) {
    console.error("GET /api/jobs error:", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
