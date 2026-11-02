
import { getDocumentCompleteness } from "../utils/documentRequirements";

export default function DocumentCompleteness({
  documents = [],
  title = "Document completeness"
}) {
  const {
    items,
    completedCount,
    totalCount,
    isComplete
  } = getDocumentCompleteness(documents);

  const progress = totalCount
    ? (completedCount / totalCount) * 100
    : 0;

  return (
    <section className="document-completeness">
      <div className="document-completeness-header">
        <div>
          <h3>{title}</h3>
          <p>
            {completedCount} of {totalCount} required categories complete.
          </p>
        </div>

        <span
          className={`document-completeness-badge ${
            isComplete ? "complete" : "incomplete"
          }`}
        >
          {isComplete ? "Complete" : "Incomplete"}
        </span>
      </div>

      <div
        className="document-completeness-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalCount}
        aria-valuenow={completedCount}
        aria-label="Required document completeness"
      >
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="document-completeness-list">
        {items.map((item) => (
          <div
            key={item.id}
            className={`document-completeness-item ${
              item.complete ? "complete" : "incomplete"
            }`}
          >
            <span
              className="document-completeness-icon"
              aria-hidden="true"
            >
              {item.complete ? "✓" : item.required ? "!" : "○"}
            </span>

            <span className="document-completeness-label">
              {item.label}
              {!item.required && " (Optional)"}
            </span>

            <strong>
              {item.count > 0
                ? `${item.count} file${item.count === 1 ? "" : "s"}`
                : item.required
                  ? "Missing"
                  : "Optional"}
            </strong>
          </div>
        ))}
      </div>

      {!isComplete && (
        <p className="document-completeness-note">
          Missing required categories must be submitted before the request
          is considered document-complete.
        </p>
      )}
    </section>
  );
}
