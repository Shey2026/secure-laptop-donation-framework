function getLaptops() {
  return JSON.parse(localStorage.getItem("laptops")) || [];
}

function saveLaptops(laptops) {
  localStorage.setItem("laptops", JSON.stringify(laptops));
}

document.addEventListener("DOMContentLoaded", function () {
  setupLogin();
  setupITForm();
});

function showMessage(elementId, type, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function getStatusBadge(status) {
  if (status === "Pending IT Processing" || status === "Pending CSR Approval") {
    return `<span class="badge bg-warning text-dark">${status}</span>`;
  }
  if (status === "Approved for Donation") {
    return `<span class="badge bg-primary">${status}</span>`;
  }
  if (status === "Rejected") {
    return `<span class="badge bg-danger">${status}</span>`;
  }
  if (status === "Donated") {
    return `<span class="badge bg-success">${status}</span>`;
  }
  return `<span class="badge bg-secondary">${status || ""}</span>`;
}

function setupLogin() {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (username === "itadmin" && password === "admin123") {
      localStorage.setItem("role", "it");
      window.location.href = "it-dashboard.html";
    } else if (username === "csrmanager" && password === "csr123") {
      localStorage.setItem("role", "csr");
      window.location.href = "csr-dashboard.html";
    } else {
      showMessage("loginMessage", "danger", "Invalid username or password.");
    }
  });
}

function checkRole(requiredRole) {
  const role = localStorage.getItem("role");
  if (role !== requiredRole) {
    alert("Unauthorized access. Please login first.");
    window.location.href = "login.html";
  }
}

function checkRoleForRecords() {
  const role = localStorage.getItem("role");
  if (role !== "it" && role !== "csr") {
    alert("Unauthorized access. Please login first.");
    window.location.href = "login.html";
  }
}

function logout() {
  localStorage.removeItem("role");
  window.location.href = "login.html";
}

function uploadCSV() {
  const fileInput = document.getElementById("csvFile");

  if (!fileInput || !fileInput.files.length) {
    showMessage("uploadMessage", "warning", "Please choose a CSV file first.");
    return;
  }

  const file = fileInput.files[0];

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      let laptops = getLaptops();
      let duplicates = 0;
      let added = 0;

      results.data.forEach((row) => {
        const assetId = (row["Asset ID"] || "").trim();
        const serialNumber = (row["Serial Number"] || "").trim();
        const model = (row["Model"] || "").trim();
        const currentStatus = (row["Current Status"] || "Pending IT Processing").trim();

        if (assetId && serialNumber && model) {
          const exists = laptops.some(
            l => l.assetId === assetId || l.serialNumber === serialNumber
          );

          if (!exists) {
            laptops.push({
              assetId,
              serialNumber,
              model,
              currentStatus,
              sanitizationMethod: "",
              wipeLog: "",
              certificate: "",
              riskLevel: "",
              itNotes: "",
              approvedBy: "",
              approvalDate: "",
              rejectionReason: "",
              reworkNote: "",
              donationCategory: "",
              exactPlaceName: "",
              contactPerson: "",
              donationBatch: "",
              completedBy: "",
              completionDate: "",
              remarks: ""
            });
            added++;
          } else {
            duplicates++;
          }
        }
      });

      saveLaptops(laptops);

      let msg = `Inventory uploaded successfully. Added: ${added}.`;
      if (duplicates > 0) {
        msg += ` Duplicate records skipped: ${duplicates}.`;
      }

      showMessage("uploadMessage", "success", msg);

      loadITTable();
      loadCSRApprovalTable();
      loadApprovedITHandoverTable();
      loadAllRecords();
      loadStats();
      fileInput.value = "";
    }
  });
}

function loadStats() {
  const laptops = getLaptops();

  const total = laptops.length;
  const pendingIT = laptops.filter(l => l.currentStatus === "Pending IT Processing").length;
  const pendingCSR = laptops.filter(l => l.currentStatus === "Pending CSR Approval").length;
  const approved = laptops.filter(l => l.currentStatus === "Approved for Donation").length;
  const rejected = laptops.filter(l => l.currentStatus === "Rejected").length;
  const donated = laptops.filter(l => l.currentStatus === "Donated").length;

  const totalEl = document.getElementById("statTotal");
  const pendingITEl = document.getElementById("statPendingIT");
  const pendingCSREl = document.getElementById("statPendingCSR");
  const approvedEl = document.getElementById("statApproved");
  const rejectedEl = document.getElementById("statRejected");
  const donatedEl = document.getElementById("statDonated");

  if (totalEl) totalEl.textContent = total;
  if (pendingITEl) pendingITEl.textContent = pendingIT;
  if (pendingCSREl) pendingCSREl.textContent = pendingCSR;
  if (approvedEl) approvedEl.textContent = approved;
  if (rejectedEl) rejectedEl.textContent = rejected;
  if (donatedEl) donatedEl.textContent = donated;
}

function loadITTable() {
  const tableBody = document.getElementById("itLaptopTable");
  if (!tableBody) return;

  const laptops = getLaptops();
  const searchInput = document.getElementById("searchITLaptop");
  const searchValue = searchInput ? searchInput.value.trim().toLowerCase() : "";

  tableBody.innerHTML = "";

  const filteredLaptops = laptops.filter(laptop => {
    const matchesStatus = laptop.currentStatus === "Pending IT Processing";
    const matchesSearch =
      laptop.assetId.toLowerCase().includes(searchValue) ||
      laptop.serialNumber.toLowerCase().includes(searchValue) ||
      laptop.model.toLowerCase().includes(searchValue);

    return matchesStatus && matchesSearch;
  });

  if (filteredLaptops.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center">No matching laptops found.</td></tr>`;
    return;
  }

  filteredLaptops.forEach((laptop) => {
    tableBody.innerHTML += `
      <tr>
        <td>${laptop.assetId}</td>
        <td>${laptop.serialNumber}</td>
        <td>${laptop.model}</td>
        <td>${getStatusBadge(laptop.currentStatus)}</td>
        <td><button class="btn btn-sm btn-primary" onclick="selectLaptopForIT('${laptop.assetId}')">Process</button></td>
      </tr>
    `;
  });
}

function selectLaptopForIT(assetId) {
  const laptops = getLaptops();
  const laptop = laptops.find(l => l.assetId === assetId);
  if (!laptop) return;

  document.getElementById("processAssetId").value = laptop.assetId;
  document.getElementById("processSerialNumber").value = laptop.serialNumber;
  document.getElementById("processModel").value = laptop.model;
}

function setupITForm() {
  const form = document.getElementById("itProcessForm");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const assetId = document.getElementById("processAssetId").value.trim();
    const sanitizationMethod = document.getElementById("sanitizationMethod").value;
    const wipeLog = document.getElementById("wipeLog").value;
    const certificate = document.getElementById("certificate").value;
    const itNotes = document.getElementById("itNotes").value.trim();

    let laptops = getLaptops();
    const laptop = laptops.find(l => l.assetId === assetId);
    if (!laptop) return;

    let riskLevel = "Medium";

    if (
      (sanitizationMethod === "DBAN" || sanitizationMethod === "Blancco") &&
      wipeLog === "Yes" &&
      certificate === "Yes"
    ) {
      riskLevel = "Low";
    } else if (
      (sanitizationMethod === "Factory Reset" ||
        sanitizationMethod === "Formatting Only" ||
        sanitizationMethod === "Manual Delete") &&
      (wipeLog === "No" || certificate === "No")
    ) {
      riskLevel = "High";
    }

    laptop.sanitizationMethod = sanitizationMethod;
    laptop.wipeLog = wipeLog;
    laptop.certificate = certificate;
    laptop.itNotes = itNotes;
    laptop.riskLevel = riskLevel;
    laptop.currentStatus = "Pending CSR Approval";

    saveLaptops(laptops);

    showMessage(
      "itProcessMessage",
      "success",
      `IT processing completed. Risk level: <strong>${riskLevel}</strong>. Status updated to Pending CSR Approval.`
    );

    form.reset();
    document.getElementById("processAssetId").value = "";
    document.getElementById("processSerialNumber").value = "";
    document.getElementById("processModel").value = "";

    loadITTable();
    loadCSRApprovalTable();
    loadStats();
  });
}

function loadCSRApprovalTable() {
  const tableBody = document.getElementById("csrApprovalTable");
  if (!tableBody) return;

  const laptops = getLaptops();
  const searchInput = document.getElementById("searchCSRApproval");
  const searchValue = searchInput ? searchInput.value.trim().toLowerCase() : "";

  tableBody.innerHTML = "";

  const filteredLaptops = laptops.filter(laptop => {
    const matchesStatus = laptop.currentStatus === "Pending CSR Approval";
    const matchesSearch =
      laptop.assetId.toLowerCase().includes(searchValue) ||
      laptop.serialNumber.toLowerCase().includes(searchValue) ||
      laptop.model.toLowerCase().includes(searchValue);

    return matchesStatus && matchesSearch;
  });

  if (filteredLaptops.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8" class="text-center">No matching laptops found.</td></tr>`;
    return;
  }

  filteredLaptops.forEach((laptop) => {
    const approvalInfo = laptop.approvedBy
      ? `${laptop.approvedBy}<br>${laptop.approvalDate || ""}`
      : "-";

    tableBody.innerHTML += `
      <tr>
        <td>${laptop.assetId}</td>
        <td>${laptop.serialNumber}</td>
        <td>${laptop.model}</td>
        <td>${laptop.sanitizationMethod}</td>
        <td>${laptop.riskLevel}</td>
        <td>${getStatusBadge(laptop.currentStatus)}</td>
        <td>${approvalInfo}</td>
        <td>
          <button class="btn btn-sm btn-success me-1" onclick="approveLaptop('${laptop.assetId}')">Approve</button>
          <button class="btn btn-sm btn-danger" onclick="rejectLaptop('${laptop.assetId}')">Reject</button>
        </td>
      </tr>
    `;
  });
}

function approveLaptop(assetId) {
  if (!confirm("Are you sure you want to approve this laptop for donation?")) return;

  let laptops = getLaptops();
  const laptop = laptops.find(l => l.assetId === assetId);
  if (!laptop) return;

  laptop.currentStatus = "Approved for Donation";
  laptop.approvedBy = "CSR Manager";
  laptop.approvalDate = new Date().toLocaleDateString();

  saveLaptops(laptops);
  loadCSRApprovalTable();
  loadApprovedITHandoverTable();
  loadStats();
  alert("Laptop approved successfully.");
}

function rejectLaptop(assetId) {
  if (!confirm("Are you sure you want to reject this laptop?")) return;

  const rejectionReason = prompt("Enter rejection reason:");
  if (rejectionReason === null) return;

  const reworkNote = prompt("Enter rework note:");
  if (reworkNote === null) return;

  let laptops = getLaptops();
  const laptop = laptops.find(l => l.assetId === assetId);
  if (!laptop) return;

  laptop.currentStatus = "Rejected";
  laptop.rejectionReason = rejectionReason;
  laptop.reworkNote = reworkNote;

  saveLaptops(laptops);
  loadCSRApprovalTable();
  loadStats();
  alert("Laptop rejected successfully.");
}

function loadApprovedITHandoverTable() {
  const tableBody = document.getElementById("approvedITHandoverTable");
  if (!tableBody) return;

  const laptops = getLaptops();
  const searchInput = document.getElementById("searchApprovedIT");
  const searchValue = searchInput ? searchInput.value.trim().toLowerCase() : "";

  tableBody.innerHTML = "";

  const filteredLaptops = laptops.filter(laptop => {
    const matchesStatus = laptop.currentStatus === "Approved for Donation";
    const matchesSearch =
      laptop.assetId.toLowerCase().includes(searchValue) ||
      laptop.serialNumber.toLowerCase().includes(searchValue) ||
      laptop.model.toLowerCase().includes(searchValue);

    return matchesStatus && matchesSearch;
  });

  if (filteredLaptops.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="11" class="text-center">No approved laptops awaiting donation completion.</td></tr>`;
    return;
  }

  filteredLaptops.forEach((laptop) => {
    const categoryId = `category_${laptop.assetId}`;
    const placeId = `place_${laptop.assetId}`;
    const contactId = `contact_${laptop.assetId}`;
    const batchId = `batch_${laptop.assetId}`;
    const dateId = `date_${laptop.assetId}`;
    const remarksId = `remarks_${laptop.assetId}`;

    tableBody.innerHTML += `
      <tr>
        <td>${laptop.assetId}</td>
        <td>${laptop.serialNumber}</td>
        <td>${laptop.model}</td>
        <td>${getStatusBadge(laptop.currentStatus)}</td>
        <td>
          <select class="form-select" id="${categoryId}">
            <option value="">Select category</option>
            <option value="School" ${laptop.donationCategory === "School" ? "selected" : ""}>School</option>
            <option value="NGO" ${laptop.donationCategory === "NGO" ? "selected" : ""}>NGO</option>
            <option value="University" ${laptop.donationCategory === "University" ? "selected" : ""}>University</option>
            <option value="Student" ${laptop.donationCategory === "Student" ? "selected" : ""}>Student</option>
            <option value="Community Center" ${laptop.donationCategory === "Community Center" ? "selected" : ""}>Community Center</option>
            <option value="Other" ${laptop.donationCategory === "Other" ? "selected" : ""}>Other</option>
          </select>
        </td>
        <td><input type="text" class="form-control" id="${placeId}" value="${laptop.exactPlaceName || ""}" placeholder="Exact place name"></td>
        <td><input type="text" class="form-control" id="${contactId}" value="${laptop.contactPerson || ""}" placeholder="Contact person"></td>
        <td><input type="text" class="form-control" id="${batchId}" value="${laptop.donationBatch || ""}" placeholder="Batch"></td>
        <td><input type="date" class="form-control" id="${dateId}" value="${laptop.completionDate || ""}"></td>
        <td><input type="text" class="form-control" id="${remarksId}" value="${laptop.remarks || ""}" placeholder="Remarks"></td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="completeDonation('${laptop.assetId}','${categoryId}','${placeId}','${contactId}','${batchId}','${dateId}','${remarksId}')">
            Mark Donation Done
          </button>
        </td>
      </tr>
    `;
  });
}

function completeDonation(assetId, categoryId, placeId, contactId, batchId, dateId, remarksId) {
  if (!confirm("Are you sure you want to mark this laptop as donated?")) return;

  let laptops = getLaptops();
  const laptop = laptops.find(l => l.assetId === assetId);
  if (!laptop) return;

  const donationCategory = document.getElementById(categoryId).value;
  const exactPlaceName = document.getElementById(placeId).value.trim();
  const contactPerson = document.getElementById(contactId).value.trim();
  const donationBatch = document.getElementById(batchId).value.trim();
  const completionDate = document.getElementById(dateId).value;
  const remarks = document.getElementById(remarksId).value.trim();

  if (!donationCategory || !exactPlaceName || !completionDate) {
    alert("Please complete at least category, exact place name, and completion date.");
    return;
  }

  laptop.donationCategory = donationCategory;
  laptop.exactPlaceName = exactPlaceName;
  laptop.contactPerson = contactPerson;
  laptop.donationBatch = donationBatch;
  laptop.completedBy = "IT Admin";
  laptop.completionDate = completionDate;
  laptop.remarks = remarks;
  laptop.currentStatus = "Donated";

  saveLaptops(laptops);
  loadApprovedITHandoverTable();
  loadAllRecords();
  loadStats();
  alert("Donation marked completed successfully.");
}

function loadAllRecords() {
  const tableBody = document.getElementById("recordsTableBody");
  if (!tableBody) return;

  const laptops = getLaptops();
  const searchInput = document.getElementById("searchRecords");
  const searchValue = searchInput ? searchInput.value.trim().toLowerCase() : "";

  tableBody.innerHTML = "";

  const filteredLaptops = laptops.filter((laptop) => {
    return (
      (laptop.assetId || "").toLowerCase().includes(searchValue) ||
      (laptop.serialNumber || "").toLowerCase().includes(searchValue) ||
      (laptop.model || "").toLowerCase().includes(searchValue) ||
      (laptop.currentStatus || "").toLowerCase().includes(searchValue) ||
      (laptop.exactPlaceName || "").toLowerCase().includes(searchValue)
    );
  });

  if (filteredLaptops.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="20" class="text-center">No matching records found.</td></tr>`;
    return;
  }

  filteredLaptops.forEach((laptop) => {
    tableBody.innerHTML += `
      <tr>
        <td>${laptop.assetId || ""}</td>
        <td>${laptop.serialNumber || ""}</td>
        <td>${laptop.model || ""}</td>
        <td>${getStatusBadge(laptop.currentStatus || "")}</td>
        <td>${laptop.sanitizationMethod || ""}</td>
        <td>${laptop.wipeLog || ""}</td>
        <td>${laptop.certificate || ""}</td>
        <td>${laptop.riskLevel || ""}</td>
        <td>${laptop.approvedBy || ""}</td>
        <td>${laptop.approvalDate || ""}</td>
        <td>${laptop.rejectionReason || ""}</td>
        <td>${laptop.reworkNote || ""}</td>
        <td>${laptop.donationCategory || ""}</td>
        <td>${laptop.exactPlaceName || ""}</td>
        <td>${laptop.contactPerson || ""}</td>
        <td>${laptop.donationBatch || ""}</td>
        <td>${laptop.completedBy || ""}</td>
        <td>${laptop.completionDate || ""}</td>
        <td>${laptop.remarks || ""}</td>
        <td>${laptop.itNotes || ""}</td>
      </tr>
    `;
  });
}

function clearAllData() {
  if (!confirm("Are you sure you want to clear all system data?")) return;
  localStorage.removeItem("laptops");
  loadAllRecords();
  loadITTable();
  loadCSRApprovalTable();
  loadApprovedITHandoverTable();
  loadStats();
  alert("All system data cleared.");
}

function downloadCSV(data, filename) {
  if (!data.length) {
    alert("No records available to download.");
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows = [];
  csvRows.push(headers.join(","));

  data.forEach((row) => {
    const values = headers.map((header) => {
      const escaped = String(row[header] ?? "").replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  });

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadAllRecordsCSV() {
  const laptops = getLaptops();
  downloadCSV(laptops, "all_laptop_records.csv");
}

function downloadDonatedRecordsCSV() {
  const laptops = getLaptops().filter(l => l.currentStatus === "Donated");
  downloadCSV(laptops, "donated_laptop_records.csv");
}

function printDonatedRecords() {
  const donated = getLaptops().filter(l => l.currentStatus === "Donated");

  if (!donated.length) {
    alert("No donated records available to print.");
    return;
  }

  let html = `
    <html>
    <head>
      <title>Donated Laptop Records</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h2 { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 8px; font-size: 12px; }
        th { background: #eee; }
      </style>
    </head>
    <body>
      <h2>Donated Laptop Records</h2>
      <table>
        <tr>
          <th>Asset ID</th>
          <th>Serial Number</th>
          <th>Model</th>
          <th>Category</th>
          <th>Exact Place</th>
          <th>Contact Person</th>
          <th>Batch</th>
          <th>Completion Date</th>
          <th>Remarks</th>
        </tr>
  `;

  donated.forEach(l => {
    html += `
      <tr>
        <td>${l.assetId || ""}</td>
        <td>${l.serialNumber || ""}</td>
        <td>${l.model || ""}</td>
        <td>${l.donationCategory || ""}</td>
        <td>${l.exactPlaceName || ""}</td>
        <td>${l.contactPerson || ""}</td>
        <td>${l.donationBatch || ""}</td>
        <td>${l.completionDate || ""}</td>
        <td>${l.remarks || ""}</td>
      </tr>
    `;
  });

  html += `
      </table>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}