import { JobSourceAdapter } from "./base";
import { GreenhouseAdapter } from "./greenhouse";
import { LeverAdapter } from "./lever";
import { AshbyAdapter } from "./ashby";
import { WorkdayAdapter } from "./workday";
import { SmartRecruitersAdapter } from "./smartrecruiters";
import { AtsType } from "@/types";

const greenhouse = new GreenhouseAdapter();
const lever = new LeverAdapter();
const ashby = new AshbyAdapter();
const workday = new WorkdayAdapter();
const smartrecruiters = new SmartRecruitersAdapter();

export function getAdapter(atsType: AtsType): JobSourceAdapter | null {
  switch (atsType) {
    case "GREENHOUSE":
      return greenhouse;
    case "LEVER":
      return lever;
    case "ASHBY":
      return ashby;
    case "WORKDAY":
      return workday;
    case "CUSTOM":
      return smartrecruiters;
    default:
      return null;
  }
}

