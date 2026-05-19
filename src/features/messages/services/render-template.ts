const VARIABLE_RE = /\{\{(\w+)\}\}/g;

export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(VARIABLE_RE, (match, key) => {
    if (key in variables) {
      return variables[key];
    }
    return match;
  });
}
