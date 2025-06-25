// Helper: Generate unique CSS selector for an element
export function getUniqueSelector(element) {
  if (!element) return "";

  // If element has ID, use that directly
  if (element.id) return `#${element.id}`;

  // Otherwise, build selector path
  const parts = [];

  while (element && element.nodeType === Node.ELEMENT_NODE && element.tagName.toLowerCase() !== "html") {
    let selector = element.tagName.toLowerCase();

    // Add class if exists, but filter out brittle/generated classes
    if (element.className && typeof element.className === "string") {
      const classes = element.className.trim().split(/\s+/).filter(Boolean);

      // Filter out classes starting with MuiDataGridVariables- or css-
      const filteredClasses = classes.filter(
        cls => !cls.startsWith("MuiDataGridVariables-") && !cls.startsWith("css-")
      );

      if (filteredClasses.length) {
        selector += "." + filteredClasses.join(".");
      }
    }

    // Check uniqueness among siblings
    const siblings = element.parentNode ? Array.from(element.parentNode.children) : [];
    const sameTagSiblings = siblings.filter(sib => sib.tagName === element.tagName);

    if (sameTagSiblings.length > 1) {
      const index = sameTagSiblings.indexOf(element) + 1; // nth-of-type is 1-based
      selector += `:nth-of-type(${index})`;
    }

    parts.unshift(selector);
    element = element.parentElement;
  }

  return parts.join(" > ");
}
