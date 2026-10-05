import { useMemo, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { useRequests } from "../context/RequestContext";
import {
  loadDocumentData
} from "../services/documentService";
import {
  loadReportDocumentData
} from "../services/reportService";
import {
  MAX_FILE_SIZE
} from "../utils";

function dataUrlToBytes(dataUrl) {
  if (
    !dataUrl ||
    typeof dataUrl !== "string"
  ) {
    throw new Error(
      "The document has no stored file data."
    );
  }

  const commaIndex =
    dataUrl.indexOf(",");

  if (commaIndex === -1) {
    throw new Error(
      "The stored document data is invalid."
    );
  }

  const base64 =
    dataUrl
      .slice(commaIndex + 1)
      .replace(/\s/g, "");

  if (!base64) {
    throw new Error(
      "The stored document contains no file data."
    );
  }

  const normalizedBase64 =
    base64 +
    "=".repeat(
      (4 -
        (base64.length % 4)) %
        4
    );

  let binary;

  try {
    binary =
      atob(normalizedBase64);
  } catch {
    throw new Error(
      "The stored document contains invalid file data."
    );
  }

  if (!binary.length) {
    throw new Error(
      "The stored document contains no readable data."
    );
  }

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(
        index
      );
  }

  return bytes;
}

function isPdfBytes(bytes) {
  return (
    bytes &&
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

function isPngBytes(bytes) {
  return (
    bytes &&
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

function isJpegBytes(bytes) {
  return (
    bytes &&
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  );
}

function getDocumentType(
  item,
  bytes
) {
  const type =
    String(
      item?.contentType || ""
    )
      .toLowerCase()
      .trim();

  const name =
    String(
      item?.fileName || ""
    )
      .toLowerCase()
      .trim();

  if (
    type === "application/pdf" ||
    name.endsWith(".pdf")
  ) {
    return "pdf";
  }

  if (
    type === "image/png" ||
    name.endsWith(".png")
  ) {
    return "png";
  }

  if (
    type === "image/jpeg" ||
    type === "image/jpg" ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg")
  ) {
    return "jpg";
  }

  if (isPdfBytes(bytes)) {
    return "pdf";
  }

  if (isPngBytes(bytes)) {
    return "png";
  }

  if (isJpegBytes(bytes)) {
    return "jpg";
  }

  return "";
}

function isSupported(item) {
  const type =
    String(
      item?.contentType || ""
    )
      .toLowerCase()
      .trim();

  const name =
    String(
      item?.fileName || ""
    )
      .toLowerCase()
      .trim();

  return (
    type === "application/pdf" ||
    type === "image/png" ||
    type === "image/jpeg" ||
    type === "image/jpg" ||
    name.endsWith(".pdf") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg")
  );
}

async function appendDocument(
  pdf,
  item,
  dataUrl
) {
  const fileName =
    item?.fileName ||
    "Unnamed document";

  const bytes =
    dataUrlToBytes(dataUrl);

  if (!bytes.length) {
    throw new Error(
      `${fileName}: The document is empty.`
    );
  }

  if (
    item.fileSize &&
    bytes.length !==
      Number(item.fileSize)
  ) {
    throw new Error(
      `${fileName}: The stored file is incomplete.`
    );
  }

  const type =
    getDocumentType(
      item,
      bytes
    );

  if (!type) {
    throw new Error(
      `${fileName}: The file format could not be identified.`
    );
  }

  if (type === "pdf") {
    if (!isPdfBytes(bytes)) {
      throw new Error(
        `${fileName}: The PDF file appears to be incomplete or corrupted.`
      );
    }

    let source;

    try {
      source =
        await PDFDocument.load(
          bytes,
          {
            ignoreEncryption: true,
            updateMetadata: false
          }
        );
    } catch {
      throw new Error(
        `${fileName}: The PDF file could not be read because it is incomplete or corrupted.`
      );
    }

    const pageIndices =
      source.getPageIndices();

    if (!pageIndices.length) {
      throw new Error(
        `${fileName}: The PDF contains no readable pages.`
      );
    }

    try {
      const pages =
        await pdf.copyPages(
          source,
          pageIndices
        );

      pages.forEach(
        (page) =>
          pdf.addPage(page)
      );
    } catch {
      throw new Error(
        `${fileName}: The PDF pages could not be copied into the report.`
      );
    }

    return;
  }

  let image;

  try {
    if (type === "png") {
      if (!isPngBytes(bytes)) {
        throw new Error(
          "The PNG file appears to be incomplete or corrupted."
        );
      }

      image =
        await pdf.embedPng(
          bytes
        );
    } else {
      if (!isJpegBytes(bytes)) {
        throw new Error(
          "The JPG file appears to be incomplete or corrupted."
        );
      }

      image =
        await pdf.embedJpg(
          bytes
        );
    }
  } catch (error) {
    throw new Error(
      `${fileName}: ${
        error?.message ||
        "The image could not be embedded into the report."
      }`
    );
  }

  if (
    !image.width ||
    !image.height
  ) {
    throw new Error(
      `${fileName}: The image dimensions could not be read.`
    );
  }

  const maxWidth = 595;
  const maxHeight = 842;

  const scale =
    Math.min(
      maxWidth /
        image.width,
      maxHeight /
        image.height,
      1
    );

  const width =
    image.width * scale;

  const height =
    image.height * scale;

  const page =
    pdf.addPage([
      595,
      842
    ]);

  page.drawImage(
    image,
    {
      x:
        (595 - width) /
        2,
      y:
        (842 - height) /
        2,
      width,
      height
    }
  );
}

function readFileAsDataUrl(
  file
) {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () =>
        resolve(
          reader.result
        );

      reader.onerror = () =>
        reject(
          new Error(
            "The selected file could not be read."
          )
        );

      reader.readAsDataURL(
        file
      );
    }
  );
}

export default function ReportGeneration() {
  const {
    requests,
    documents,
    reportDocuments,
    addReportDocument,
    deleteReportDocument
  } = useRequests();

  const [
    selectedRequestId,
    setSelectedRequestId
  ] = useState("");

  const [busy, setBusy] =
    useState(false);

  const [
    uploading,
    setUploading
  ] = useState(false);

  const fileInputRef =
    useRef(null);

  const approvedRequests =
    useMemo(
      () =>
        requests
          .filter(
            (request) =>
              request.status ===
              "Approved"
          )
          .sort((a, b) =>
            String(
              b.createdAt || ""
            ).localeCompare(
              String(
                a.createdAt || ""
              )
            )
          ),
      [requests]
    );

  const selectedRequest =
    approvedRequests.find(
      (request) =>
        request.id ===
        selectedRequestId
    );

  const clientDocuments =
    useMemo(
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

  const engineerDocuments =
    useMemo(
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

  const allDocuments =
    useMemo(
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
      (item) =>
        !isSupported(item)
    );

  const handleAddEngineerDocument =
    async (event) => {
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

      if (
        file.size >
        MAX_FILE_SIZE
      ) {
        alert(
          "This file is too large. The maximum file size is 5 MB."
        );
        return;
      }

      setUploading(true);

      try {
        await addReportDocument({
          requestId:
            selectedRequestId,
          file
        });
      } catch (error) {
        try {
          const data =
            await readFileAsDataUrl(
              file
            );

          await addReportDocument({
            requestId:
              selectedRequestId,
            fileName:
              file.name,
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
            fileSize:
              file.size,
            data
          });
        } catch (fallbackError) {
          alert(
            fallbackError?.message ||
              error?.message ||
              "The engineer document could not be added."
          );
        }
      } finally {
        setUploading(false);
      }
    };

  const removeEngineerDocument =
    async (item) => {
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

  const getStoredData =
    async (item) => {
      if (
        item.collectionName ===
        "reportDocuments"
      ) {
        return loadReportDocumentData(
          item
        );
      }

      const reportLike =
        reportDocuments.some(
          (reportDocument) =>
            reportDocument.id ===
            item.id
        );

      if (reportLike) {
        return loadReportDocumentData(
          item
        );
      }

      return loadDocumentData(
        item
      );
    };

  const exportPdf =
    async () => {
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

        const failedDocuments =
          [];

        for (
          const item of clientDocuments
        ) {
          try {
            const dataUrl =
              await loadDocumentData(
                item
              );

            if (!dataUrl) {
              throw new Error(
                `${item.fileName || "Client document"}: The stored file could not be reconstructed.`
              );
            }

            await appendDocument(
              pdf,
              item,
              dataUrl
            );
          } catch (error) {
            failedDocuments.push(
              error?.message ||
                `${item.fileName || "Client document"} could not be added.`
            );
          }
        }

        for (
          const item of engineerDocuments
        ) {
          try {
            const dataUrl =
              await loadReportDocumentData(
                item
              );

            if (!dataUrl) {
              throw new Error(
                `${item.fileName || "Engineer document"}: The stored file could not be reconstructed.`
              );
            }

            await appendDocument(
              pdf,
              item,
              dataUrl
            );
          } catch (error) {
            failedDocuments.push(
              error?.message ||
                `${item.fileName || "Engineer document"} could not be added.`
            );
          }
        }

        if (
          !pdf.getPageCount()
        ) {
          if (
            failedDocuments.length
          ) {
            throw new Error(
              `No readable documents were found.\n\n${failedDocuments.join(
                "\n"
              )}`
            );
          }

          throw new Error(
            "There are no readable documents to export."
          );
        }

        const bytes =
          await pdf.save();

        if (
          !bytes ||
          !bytes.length
        ) {
          throw new Error(
            "The generated PDF is empty."
          );
        }

        const blob =
          new Blob(
            [bytes],
            {
              type:
                "application/pdf"
            }
          );

        const url =
          URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            "a"
          );

        link.href = url;

        link.download =
          `AGRIhelp-Documents-${
            selectedRequest.referenceNumber ||
            selectedRequestId
          }.pdf`;

        document.body.appendChild(
          link
        );

        link.click();

        link.remove();

        setTimeout(() => {
          URL.revokeObjectURL(
            url
          );
        }, 1000);

        if (
          failedDocuments.length
        ) {
          alert(
            `The report was generated, but some documents could not be included:\n\n${failedDocuments.join(
              "\n"
            )}`
          );
        }
      } catch (error) {
        const message =
          error?.message ||
          "";

        if (
          message
            .toLowerCase()
            .includes(
              "offset is outside"
            )
        ) {
          alert(
            "The report could not be generated because one of the stored documents is incomplete or corrupted. Please remove the affected document and upload it again."
          );
        } else {
          alert(
            message ||
              "The PDF could not be generated."
          );
        }
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

          <h1>
            Generate Report
          </h1>

          <p>
            Generate a document report
            from an approved client
            submission.
          </p>
        </div>
      </div>

      <div className="report-layout">
        <section className="card report-control-card">
          <h3>
            Select approved submission
          </h3>

          <p className="muted">
            Only requests that have
            been approved by an
            engineer can be selected.
          </p>

          <label>
            Approved client submission
          </label>

          <select
            value={
              selectedRequestId
            }
            onChange={(event) =>
              setSelectedRequestId(
                event.target.value
              )
            }
          >
            <option value="">
              Select an approved
              submission
            </option>

            {approvedRequests.map(
              (request) => (
                <option
                  value={request.id}
                  key={request.id}
                >
                  {request.referenceNumber ||
                    request.id}{" "}
                  —{" "}
                  {request.association ||
                    "Association"}
                </option>
              )
            )}
          </select>

          {approvedRequests.length ===
            0 && (
            <div className="empty-state">
              There are currently no
              approved requests
              available for document
              reporting.
            </div>
          )}

          {selectedRequestId && (
            <div className="report-engineer-upload">
              <h3>
                Add Engineer Documents
              </h3>

              <p className="muted">
                Add supporting
                documents prepared by
                the engineer for this
                report.
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
                PDF, PNG, or JPG.
                Maximum 5 MB.
              </span>
            </div>
          )}

          <button
            type="button"
            className="primary-btn full report-export-button"
            onClick={
              exportPdf
            }
            disabled={
              busy ||
              uploading ||
              !selectedRequestId ||
              !allDocuments.length ||
              unsupported.length >
                0
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
                {
                  allDocuments.length
                }{" "}
                document
                {allDocuments.length ===
                1
                  ? ""
                  : "s"}{" "}
                included
              </p>
            </div>
          </div>

          {!selectedRequestId && (
            <div className="empty-state">
              Select an approved
              client submission to
              view its documents.
            </div>
          )}

          {selectedRequestId &&
            clientDocuments.length ===
              0 &&
            engineerDocuments.length ===
              0 && (
              <div className="empty-state">
                No documents have
                been attached to this
                approved submission.
              </div>
            )}

          {selectedRequestId &&
            clientDocuments.length >
              0 && (
              <div className="report-document-group">
                <span className="report-group-label">
                  Client documents
                </span>

                {clientDocuments.map(
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
                          {
                            item.fileName
                          }
                        </strong>

                        <span>
                          {(
                            Number(
                              item.fileSize ||
                                0
                            ) /
                            1024
                          ).toFixed(
                            0
                          )}{" "}
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
            engineerDocuments.length >
              0 && (
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
                          {
                            item.fileName
                          }
                        </strong>

                        <span>
                          {(
                            Number(
                              item.fileSize ||
                                0
                            ) /
                            1024
                          ).toFixed(
                            0
                          )}{" "}
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

          {unsupported.length >
            0 && (
            <div className="report-warning">
              Unsupported files are
              present. Export requires
              PDF, PNG, or JPG
              documents.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

