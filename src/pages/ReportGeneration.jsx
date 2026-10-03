import { useMemo, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { useRequests } from "../context/RequestContext";

function dataUrlToBytes(dataUrl) {
  const base64 =
    String(dataUrl || "").split(",")[1] || "";

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function isSupported(item) {
  return (
    item.contentType === "application/pdf" ||
    item.contentType === "image/png" ||
    item.contentType === "image/jpeg" ||
    item.fileName
      ?.toLowerCase()
      .endsWith(".pdf") ||
    /\.(png|jpe?g)$/i.test(
      item.fileName || ""
    )
  );
}

async function appendDocument(pdf, item) {
  const bytes = dataUrlToBytes(item.data);
  const type = item.contentType || "";
  const name = item.fileName || "";

  const isPdf =
    type === "application/pdf" ||
    name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    const source =
      await PDFDocument.load(bytes);

    const pages = await pdf.copyPages(
      source,
      source.getPageIndices()
    );

    pages.forEach((page) =>
      pdf.addPage(page)
    );

    return;
  }

  const image =
    type === "image/png" ||
    name.toLowerCase().endsWith(".png")
      ? await pdf.embedPng(bytes)
      : await pdf.embedJpg(bytes);

  const maxWidth = 595;
  const maxHeight = 842;

  const scale = Math.min(
    maxWidth / image.width,
    maxHeight / image.height,
    1
  );

  const width = image.width * scale;
  const height = image.height * scale;

  const page = pdf.addPage([
    595,
    842
  ]);

  page.drawImage(image, {
    x: (595 - width) / 2,
    y: (842 - height) / 2,
    width,
    height
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () =>
      resolve(reader.result);

    reader.onerror = () =>
      reject(
        new Error(
          "The selected file could not be read."
        )
      );

    reader.readAsDataURL(file);
  });
}

export default function ReportGeneration() {
  const {
    requests,
    documents,
    reportDocuments,
    addReportDocument,
    deleteReportDocument
  } = useRequests();

  const [selectedRequestId, setSelectedRequestId] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const fileInputRef =
    useRef(null);

  const approvedRequests = useMemo(
    () =>
      requests
        .filter(
          (request) =>
            request.status === "Approved"
        )
        .sort((a, b) =>
          String(
            b.createdAt || ""
          ).localeCompare(
            String(a.createdAt || "")
          )
        ),
    [requests]
  );

  const selectedRequest =
    approvedRequests.find(
      (request) =>
        request.id === selectedRequestId
    );

  const clientDocuments = useMemo(
    () =>
      selectedRequestId
        ? documents.filter(
            (item) =>
              item.requestId ===
                selectedRequestId &&
              item.clientId ===
                selectedRequest?.clientId
          )
        : [],
    [
      documents,
      selectedRequestId,
      selectedRequest?.clientId
    ]
  );

  const engineerDocuments = useMemo(
    () =>
      selectedRequestId
        ? reportDocuments.filter(
            (item) =>
              item.requestId ===
              selectedRequestId
          )
        : [],
    [
      reportDocuments,
      selectedRequestId
    ]
  );

  const allDocuments = useMemo(
    () => [
      ...clientDocuments,
      ...engineerDocuments
    ],
    [
      clientDocuments,
      engineerDocuments
    ]
  );

  const unsupported =
    allDocuments.filter(
      (item) => !isSupported(item)
    );

  const handleAddEngineerDocument = async (
    event
  ) => {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    if (!selectedRequestId) {
      alert(
        "Please select an approved client submission first."
      );
      return;
    }

    const validTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg"
    ];

    const validExtension =
      /\.(pdf|png|jpe?g)$/i.test(
        file.name
      );

    if (
      !validTypes.includes(
        file.type
      ) &&
      !validExtension
    ) {
      alert(
        "Only PDF, PNG, and JPG files can be added."
      );
      return;
    }

    if (file.size > 900 * 1024) {
      alert(
        "This file is too large for Firestore storage. Please use a file smaller than 900 KB."
      );
      return;
    }

    setUploading(true);

    try {
      const data =
        await readFileAsDataUrl(file);

      await addReportDocument({
        requestId:
          selectedRequestId,
        fileName: file.name,
        contentType:
          file.type ||
          (
            file.name
              .toLowerCase()
              .endsWith(".pdf")
              ? "application/pdf"
              : file.name
                  .toLowerCase()
                  .endsWith(".png")
                ? "image/png"
                : "image/jpeg"
          ),
        fileSize: file.size,
        data
      });
    } catch (error) {
      alert(
        error?.message ||
          "The engineer document could not be added."
      );
    } finally {
      setUploading(false);
    }
  };

  const removeEngineerDocument = async (
    item
  ) => {
    const confirmed =
      window.confirm(
        `Remove "${item.fileName}" from this report?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteReportDocument(
        item.id
      );
    } catch (error) {
      alert(
        error?.message ||
          "The document could not be removed."
      );
    }
  };

  const exportPdf = async () => {
    if (
      !selectedRequestId ||
      !selectedRequest
    ) {
      alert(
        "Please select an approved client submission."
      );
      return;
    }

    if (!allDocuments.length) {
      alert(
        "This approved request has no documents."
      );
      return;
    }

    if (unsupported.length) {
      alert(
        "All documents must be PDF, PNG, or JPG files before exporting."
      );
      return;
    }

    setBusy(true);

    try {
      const pdf =
        await PDFDocument.create();

      for (const item of clientDocuments) {
        await appendDocument(
          pdf,
          item
        );
      }

      for (const item of engineerDocuments) {
        await appendDocument(
          pdf,
          item
        );
      }

      if (!pdf.getPageCount()) {
        throw new Error(
          "There are no readable documents to export."
        );
      }

      const bytes =
        await pdf.save();

      const blob = new Blob(
        [bytes],
        {
          type: "application/pdf"
        }
      );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download = `AGRIhelp-Documents-${
        selectedRequest.referenceNumber ||
        selectedRequestId
      }.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      alert(
        error?.message ||
          "The PDF could not be generated."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page-container report-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">
            DOCUMENT REPORTS
          </span>

          <h1>Generate Report</h1>

          <p>
            Generate a document report from an
            approved client submission.
          </p>
        </div>
      </div>

      <div className="report-layout">
        <section className="card report-control-card">
          <h3>
            Select approved submission
          </h3>

          <p className="muted">
            Only requests that have been approved
            by an engineer can be selected.
          </p>

          <label>
            Approved client submission
          </label>

          <select
            value={selectedRequestId}
            onChange={(event) =>
              setSelectedRequestId(
                event.target.value
              )
            }
          >
            <option value="">
              Select an approved submission
            </option>

            {approvedRequests.map(
              (request) => (
                <option
                  value={request.id}
                  key={request.id}
                >
                  {request.referenceNumber ||
                    request.id}{" "}
                  — {request.association}
                </option>
              )
            )}
          </select>

          {approvedRequests.length === 0 && (
            <div className="empty-state">
              There are currently no approved
              requests available for document
              reporting.
            </div>
          )}

          {selectedRequestId && (
            <div className="report-engineer-upload">
              <h3>
                Add Engineer Documents
              </h3>

              <p className="muted">
                Add supporting documents prepared
                by the engineer for this report.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                onChange={
                  handleAddEngineerDocument
                }
                hidden
              />

              <button
                type="button"
                className="secondary-btn full"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={
                  uploading ||
                  busy
                }
              >
                {uploading
                  ? "Adding Document..."
                  : "Add Engineer Document"}
              </button>

              <span className="muted">
                PDF, PNG, or JPG. Maximum 900 KB.
              </span>
            </div>
          )}

          <button
            type="button"
            className="primary-btn full report-export-button"
            onClick={exportPdf}
            disabled={
              busy ||
              uploading ||
              !selectedRequestId ||
              !allDocuments.length ||
              unsupported.length > 0
            }
          >
            {busy
              ? "Generating PDF..."
              : "Export Documents as PDF"}
          </button>
        </section>

        <section className="card report-documents-card">
          <div className="section-title">
            <div>
              <h3>
                Report Documents
              </h3>

              <p>
                {allDocuments.length} document
                {allDocuments.length === 1
                  ? ""
                  : "s"} included
              </p>
            </div>
          </div>

          {!selectedRequestId && (
            <div className="empty-state">
              Select an approved client submission
              to view its documents.
            </div>
          )}

          {selectedRequestId &&
            clientDocuments.length === 0 &&
            engineerDocuments.length === 0 && (
              <div className="empty-state">
                No documents have been attached to
                this approved submission.
              </div>
            )}

          {selectedRequestId &&
            clientDocuments.length > 0 && (
              <div className="report-document-group">
                <span className="report-group-label">
                  Client documents
                </span>

                {clientDocuments.map(
                  (item) => (
                    <div
                      className="report-document-row "
                      key={item.id}
                    >
                      <div className="report-document-icon ">
                        {item.contentType ===
                        "application/pdf"
                          ? "PDF"
                          : "IMG"}
                      </div>

                      <div className="report-document-name ">
                        <strong>
                          {item.fileName}
                        </strong>

                        <span>
                          {(
                            item.fileSize /
                            1024
                          ).toFixed(0)}{" "}
                          KB
                        </span>
                      </div>

                      <span className="report-source">
                        Client
                      </span>
                    </div>
                  )
                )}
              </div>
            )}

          {selectedRequestId &&
            engineerDocuments.length > 0 && (
              <div className="report-document-group">
                <span className="report-group-label">
                  Engineer documents
                </span>

                {engineerDocuments.map(
                  (item) => (
                    <div
                      className="report-document-row"
                      key={item.id}
                    >
                      <div className="report-document-icon">
                        {item.contentType ===
                        "application/pdf"
                          ? "PDF"
                          : "IMG"}
                      </div>

                      <div className="report-document-name">
                        <strong>
                          {item.fileName}
                        </strong>

                        <span>
                          {(
                            item.fileSize /
                            1024
                          ).toFixed(0)}{" "}
                          KB
                        </span>
                      </div>

                      <span className="report-source">
                        Engineer
                      </span>

                      <button
                        type="button"
                        className="danger-btn"
                        onClick={() =>
                          removeEngineerDocument(
                            item
                          )
                        }
                        disabled={busy}
                      >
                        Remove
                      </button>
                    </div>
                  )
                )}
              </div>
            )}

          {unsupported.length > 0 && (
            <div className="report-warning">
              Unsupported files are present.
              Export requires PDF, PNG, or JPG
              documents.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

