import { AudioLines, Command, Music2, Search, Settings2 } from "lucide-react";
import { actionDefinitions, type ActionCategory, type ActionDefinition } from "../domain/actions";
import { iconForAction } from "./actionIcon";

const categories: ActionCategory[] = ["Audio", "Media", "Shortcuts", "System"];
const categoryIcons = { Audio: AudioLines, Media: Music2, Shortcuts: Command, System: Settings2 };

export function ActionLibrary({ query, onQuery, onChoose }: { query: string; onQuery: (value: string) => void; onChoose: (action: ActionDefinition) => void }) {
  const filtered = actionDefinitions.filter((item) => `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(query.toLowerCase()));
  return <aside className="action-library panel">
    <div className="panel-heading"><div><span className="eyebrow">Library</span><h2>Actions</h2></div><span className="count">{filtered.length}</span></div>
    <label className="search"><Search size={16}/><span className="sr-only">Search actions</span><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search actions" /></label>
    <div className="action-list" aria-label="Categorized actions">
      {categories.map((category) => {
        const items = filtered.filter((item) => item.category === category);
        if (items.length === 0) return null;
        const CategoryIcon = categoryIcons[category];
        const headingId = `action-category-${category.toLowerCase()}`;
        return <section className="action-category" aria-labelledby={headingId} key={category}>
          <header className="category-heading"><span><CategoryIcon size={13}/><strong id={headingId}>{category}</strong></span><small>{items.length}</small></header>
          <div className="category-actions">
            {items.map((item) => { const ActionIcon = iconForAction(item.defaults); return <button className="action-card" key={item.type} onClick={() => onChoose(item)}>
              <span className="action-icon"><ActionIcon size={17}/></span><span><strong>{item.name}</strong><small>{item.description}</small></span>
            </button> })}
          </div>
        </section>;
      })}
      {filtered.length === 0 && <div className="action-empty"><Search size={16}/><strong>No matching actions</strong><span>Try another name or category.</span></div>}
    </div>
  </aside>;
}
