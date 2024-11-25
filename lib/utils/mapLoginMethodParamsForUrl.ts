import { LoginMethodParams } from "../types";
import { sanitizeUrl } from "./sanitizeUrl";

export const mapLoginMethodParamsForUrl = (
  options: Partial<LoginMethodParams>,
): Record<string, string> => {
  const translate: Record<string, string | undefined> = {
    login_hint: options.loginHint,
    is_create_org: options.isCreateOrg?.toString(),
    connection_id: options.connectionId,
    redirect_uri: options.redirectURL
      ? sanitizeUrl(options.redirectURL)
      : undefined,
    audience: options.audience || "",
    scope: options.scope?.join(" ") || "email profile openid offline",
    prompt: options.prompt,
    lang: options.lang,
    org_code: options.orgCode,
    org_name: options.orgName,
    has_success_page: options.hasSuccessPage?.toString(),
    workflow_deployment_id: options.workflowDeploymentId
  };

  Object.keys(translate).forEach(
    (key) => translate[key] === undefined && delete translate[key],
  );
  return translate as Record<string, string>;
};
