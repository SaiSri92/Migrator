let artifactsList = [];  // Global list to track artifacts

async function showTable(event) {
  event.preventDefault();
  try {
    // Show the loading spinner
    document.getElementById('loadingSpinner').style.display = 'block';

    const tenantSelect = document.getElementById('tenant-select');
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('Failed to fetch tenant data');

    const tenantList = await response.json();
    const selectedTenant = JSON.parse(tenantList).find(t => t.tenantName === tenantSelect.value);

    const artifacts = await AddIntegrationFlows(selectedTenant);
    artifactsList = artifacts;

    const packageDropdown = document.getElementById('packageId');
    packageDropdown.innerHTML = '<option value="">-- Select Package ID --</option>';
    const uniquePackages = [...new Set(artifacts.map(a => a.integrationFlowPackageId))];

    uniquePackages.forEach(pkgId => {
      const option = document.createElement('option');
      option.value = pkgId;
      option.textContent = pkgId;
      packageDropdown.appendChild(option);
    });

    document.getElementById('flowId').innerHTML = '<option value="">-- Select Flow ID --</option>';
    document.getElementById('step2').style.display = 'block';
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Hide the loading spinner
    document.getElementById('loadingSpinner').style.display = 'none';
  }
}

function updateFlowIds() {
  const selectedPackageId = document.getElementById('packageId').value;
  const flowDropdown = document.getElementById('flowId');
  flowDropdown.innerHTML = '<option value="">-- Select Flow ID --</option>';
  const filtered = artifactsList.filter(a => a.integrationFlowPackageId === selectedPackageId);
  filtered.forEach(a => {
    const option = document.createElement('option');
    option.value = a.integrationFlowId;
    option.textContent = a.integrationFlowId;
    flowDropdown.appendChild(option);
  });

  document.getElementById('hiddenmessage').value = artifactsList;
}

async function AddIntegrationFlows(tenant) {
  const token = await getAccessToken(tenant);
  const packages = await getIntegrationPackages(token, tenant.tenantURL);
  let allArtifacts = [];

  /* for (const pkg of packages) {
     const artifacts = await getDesignTimeArtifacts(token, pkg.Id, tenant.tenantURL);
     const processed = artifacts.map(a => ({
       integrationFlowName: a.Name,
       integrationFlowId: a.Id,
       integrationFlowVersion: a.Version,
       integrationFlowPackageId: a.PackageId,
       iflowDownloadLocally: a.__metadata.media_src
     }));
     allArtifacts.push(...processed);
   }*/
  const promises = packages.map(pkg =>
    getDesignTimeArtifacts(token, pkg.Id, tenant.tenantURL)
      .then(artifacts => {
        const processed = artifacts.map(a => ({
          integrationFlowName: a.Name,
          integrationFlowId: a.Id,
          integrationFlowVersion: a.Version,
          integrationFlowPackageId: a.PackageId,
          iflowDownloadLocally: a.__metadata.media_src
        }));
        return processed;
      })
  );

  const results = await Promise.all(promises);
  results.forEach(processedArtifacts => {
    allArtifacts.push(...processedArtifacts);
  });

  return allArtifacts;
}

async function getAccessToken(tenant) {
  const response = await axios.post('/proxy/token', {
    tokenURL: tenant.tokenURL,
    clientId: tenant.clientId,
    clientSecret: tenant.clientSecret
  });
  return response.data.access_token;
}

async function getIntegrationPackages(token, url) {
  const response = await axios.get('/proxy/IntegrationPackages', {
    headers: { Authorization: `Bearer ${token}` },
    params: { packagesUrl: `https://${url}/api/v1/IntegrationPackages` }
  });
  return response.data.d.results;
}

async function getDesignTimeArtifacts(token, pkgId, url) {
  const response = await axios.get('/proxy/DesignTimeArtifacts', {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      artifactsUrl: `https://${url}/api/v1/IntegrationPackages('${pkgId}')/IntegrationDesigntimeArtifacts`
    }
  });
  return response.data.d.results;
}
async function DownloadManually(encodedUrl) {
  const decodedUrl = decodeURIComponent(encodedUrl);
  console.log(`DownloadManually for ${decodedUrl.replaceAll("%27", "'")}`);
  let TenantList, tenantSelect;
  try {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('Network response was not ok');
    TenantList = await response.json();
    tenantSelect = document.getElementById('tenant-select');
  } catch (error) {
    console.error('Error fetching tenant data:', error);
    return;
  }

  let TenantJSON = JSON.parse(TenantList).find(tenant => tenant.tenantName === tenantSelect.value);
  if (!TenantJSON) {
    console.error('Tenant not found');
    return;
  }
  TenantList = TenantJSON;
  const flowId = document.getElementById('flowId').value;
  try {
    const accessToken = await getAccessToken(TenantList);
    const response = await axios.get('/proxy/TempDownloadIflow', {
      params: {
        packagesUrl: decodedUrl,
        flowId: flowId
      },
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
      responseType: 'blob'
    });

    console.log("decodedUrl is " + decodedUrl + "    " + flowId + "    " + flowId);

  } catch (error) {
    console.error('Error Downloading integration flows:', error.response ? error.response.data : error.message);
  }
}


function checkTxLog() {
  const result = evalTxLog();
  if (result) {
    document.getElementById('step3').style.display = 'block';
    let artifacts = document.getElementById('hiddenmessage').value;
    const packageId = document.getElementById('packageId').value;
    const flowId = document.getElementById('flowId').value;

    const matchedArtifacts = artifacts.filter(a =>
      a.integrationFlowPackageId === packageId && a.integrationFlowId === flowId
    );


    const downloadLinks = matchedArtifacts.map(a => a.iflowDownloadLocally);
    alert(` Download Links: ${downloadLinks.join(', ')}`);

    let iflowDownloadLocally = encodeURIComponent(downloadLinks.toString().replaceAll("'", "%27"));
    DownloadManually(iflowDownloadLocally);


  }
}

function evalTxLog() {
  // For now, always return true
  return true;
}

function doMagic() {
  const addTxLog = document.getElementById('addTxLog').checked;
  const deployOption = document.getElementById('deployOption').value;
  const packageId = document.getElementById('packageId').value;
  const flowId = document.getElementById('flowId').value;

  console.log('DoMagic triggered with options:');
  console.log('Add TxLog:', addTxLog);
  console.log('Deployment Option:', deployOption);
  console.log('flowId', flowId);

  if (addTxLog) {
    if (deployOption === "download") {
      axios.post('/downloadflowId', null, {
        params: {
          flowId: flowId + ".zip"
        },
        responseType: 'blob',
        validateStatus: function (status) {
          return status >= 200 && status < 500; // Handle 404 in .then instead of .catch
        }
      })
      .then(response => {
        if (response.status === 404) {
          alert('Already Downloaded! Hence memory is cleared, please redo the process from Step1');
          return;
        }
      
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = flowId + ".zip";
        a.click();
        a.remove();

        axios.post('/deleteflowId', null, {
          params: {
            flowId: flowId + ".zip"
          }});


      })
      .catch(error => {
        console.error("Download failed:", error);
        alert('An error occurred while downloading.');
      });
    }
  }

}


// === SCRIPT END ===