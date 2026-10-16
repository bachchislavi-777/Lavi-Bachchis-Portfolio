// The website's packages (from src/data/copy.json), so the studio offers exactly what the Services page sells.
import copy from '../../src/data/copy.json' with { type: 'json' };

export const PACKAGES = copy.services.packages
  .filter((p) => !p.custom)
  .map((p) => ({ name: p.name, gbp: p.gbp, items: p.items.map((i) => ({ label: i.label, value: i.value })) }));
