import { withPublicApiRateLimit } from "@/utils/prtl";
import { entryCall } from "@/utils/publicApi/userbook";

export default withPublicApiRateLimit(entryCall("termination"));
