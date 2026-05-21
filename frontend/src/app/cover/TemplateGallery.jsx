import TemplateCard from './TemplateCard';

export default function TemplateGallery({ templates, selectedId, onSelect }) {
  return (
    <div
      className="
        flex gap-3 p-4
        overflow-x-auto scroll-smooth snap-x snap-mandatory
        md:grid md:grid-cols-3 md:overflow-x-visible md:snap-none
        lg:grid-cols-4
      "
      role="group"
      aria-label="Template gallery"
    >
      {templates.map((template) => (
        <div
          key={template.id}
          className="min-w-[140px] snap-start shrink-0 md:min-w-0 md:shrink"
        >
          <TemplateCard
            template={template}
            isSelected={selectedId === template.id}
            onSelect={onSelect}
          />
        </div>
      ))}
    </div>
  );
}