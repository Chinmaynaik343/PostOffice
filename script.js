
const getDataBtn = document.getElementById("get-data-btn");
const message = document.getElementById("message");
const searchInput = document.getElementById("search");
const postOfficeList = document.getElementById("post-office-list");
const postOfficeCount = document.getElementById("post-office-count");

let postOffices = [];
let clockInterval = null;

// Safely update text on the page
function setText(id, value) {
  document.getElementById(id).textContent =
    value === undefined || value === null || value === ""
      ? "Not available"
      : value;
}

// Get public IP address
async function getPublicIP() {
  const response = await fetch("https://api.ipify.org?format=json");

  if (!response.ok) {
    throw new Error("Unable to retrieve your public IP address.");
  }

  const data = await response.json();

  if (!data.ip) {
    throw new Error("Public IP address was not returned.");
  }

  return data.ip;
}

// Fetch information from ipinfo.io
async function getLocationInfo(ip) {
  const response = await fetch(
    `https://ipinfo.io/${encodeURIComponent(ip)}/geo`
  );

  if (!response.ok) {
    throw new Error(
      "Unable to retrieve location details. The API may be unavailable."
    );
  }

  const data = await response.json();

  if (data.error || !data.loc) {
    throw new Error(
      data.error?.message || "Location coordinates are unavailable."
    );
  }

  return data;
}

// Display the location information
function displayLocation(data) {
  const [lat, lon] = data.loc.split(",").map(Number);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Invalid latitude or longitude received.");
  }

  setText("ip", data.ip);
  setText("city", data.city);
  setText("region", data.region);
  setText("country", data.country);
  setText("postal", data.postal);
  setText("timezone", data.timezone);
  setText("latitude", lat);
  setText("longitude", lon);

  // Google Maps embed with a marker at the coordinates
  document.getElementById("map").src =
    `https://maps.google.com/maps?q=${lat},${lon}&z=14&output=embed`;

  // Update the clock for the returned timezone
  startLocalClock(data.timezone);

  return data;
}

// Display and continuously update local time
function startLocalClock(timezone) {
  if (clockInterval !== null) {
    clearInterval(clockInterval);
  }

  function updateClock() {
    try {
      const time = new Intl.DateTimeFormat("en-IN", {
        timeZone: timezone,
        dateStyle: "medium",
        timeStyle: "medium",
      }).format(new Date());

      setText("local-time", time);
    } catch (error) {
      setText("local-time", "Timezone unavailable");
    }
  }

  updateClock();
  clockInterval = setInterval(updateClock, 1000);
}

// Fetch post offices using the postal PIN code
async function getPostOffices(pincode) {
  if (!pincode) {
    throw new Error("No postal code was returned for this location.");
  }

  const response = await fetch(
    `https://api.postalpincode.in/pincode/${encodeURIComponent(pincode)}`
  );

  if (!response.ok) {
    throw new Error("Unable to retrieve post office information.");
  }

  const data = await response.json();

  if (
    !Array.isArray(data) ||
    data[0]?.Status !== "Success" ||
    !Array.isArray(data[0]?.PostOffice)
  ) {
    throw new Error("No post offices were found for this postal code.");
  }

  postOffices = data[0].PostOffice;
  renderPostOffices(postOffices);
}

// Render post office cards and apply the current search filter
function renderPostOffices(offices) {
  const query = searchInput.value.trim().toLowerCase();

  const filteredOffices = offices.filter((office) => {
    const searchableText = [
      office.Name,
      office.BranchType,
      office.DeliveryStatus,
      office.District,
      office.State,
      office.Pincode,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(query);
  });

  postOfficeList.innerHTML = "";

  postOfficeCount.textContent =
    `${filteredOffices.length} post office(s) found`;

  if (filteredOffices.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.textContent = "No matching post offices found.";
    postOfficeList.appendChild(emptyMessage);
    return;
  }

  filteredOffices.forEach((office) => {
    const card = document.createElement("article");
    card.className = "post-office-card";

    const title = document.createElement("h3");
    title.textContent = office.Name || "Unnamed Post Office";

    const fields = [
      ["Branch Type", office.BranchType],
      ["Delivery Status", office.DeliveryStatus],
      ["District", office.District],
      ["State", office.State],
      ["PIN Code", office.Pincode],
    ];

    card.appendChild(title);

    fields.forEach(([label, value]) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = `${label}: ${value || "Not available"}`;
      card.appendChild(paragraph);
    });

    postOfficeList.appendChild(card);
  });
}

// Main function: runs on page load and button click
async function getUserInfo() {
  getDataBtn.disabled = true;
  message.textContent = "Fetching your location information...";
  postOfficeList.innerHTML = "";
  postOfficeCount.textContent = "Loading post offices...";

  try {
    const ip = await getPublicIP();
    const locationData = await getLocationInfo(ip);

    const data = displayLocation(locationData);

    searchInput.value = "";
    await getPostOffices(data.postal);

    message.textContent = "Location and post office information loaded successfully.";
  } catch (error) {
    console.error(error);
    message.textContent = error.message;
    postOfficeList.innerHTML = "";
    postOfficeCount.textContent = "Post office information unavailable";
  } finally {
    getDataBtn.disabled = false;
  }
}

// Search by post office name, branch type, district, and other fields
searchInput.addEventListener("input", () => {
  renderPostOffices(postOffices);
});

// Refresh location information when the button is clicked
getDataBtn.addEventListener("click", getUserInfo);

// Load information automatically when the page opens
document.addEventListener("DOMContentLoaded", getUserInfo);
