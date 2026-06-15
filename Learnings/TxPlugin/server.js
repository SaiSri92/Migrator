const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const axios = require('axios');
const AdmZip = require('adm-zip');
const { runConversion } = require('./scripts/converter');
const { stringify, parse } = require('flatted');
const corsOptions = {
    origin: 'http://localhost:3000', // Adjust to the allowed origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
const app = express();
const port = process.env.PORT || 3000;

const upload = multer({ dest: 'uploads/' });
// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));
// Middleware to parse JSON request bodies
app.use(express.json()); // This line enables JSON parsing

app.use(cors(corsOptions));
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Array to hold tenant data
let tenants = [];

// Function to load tenants from the JSON file
const loadTenants = () => {
    const filePath = path.join(__dirname, 'tenants.json');
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath);
        tenants = JSON.parse(data); // Parse the JSON data into an array
    } else {
        fs.writeFileSync('tenants.json', JSON.stringify([])); // Initialize with an empty array
    }
};

// Call the loadTenants function at the start
loadTenants();

// Route to handle the home page
app.get('/', (req, res) => {
    res.render('index', { tenants }); // Render the index.ejs template with tenants data
});

app.post('/proxy/token', async (req, res) => {
    const { tokenURL, clientId, clientSecret } = req.body;
    if (!tokenURL || !clientId || !clientSecret) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log('Received:', { tokenURL, clientId, clientSecret });

    try {
        const response = await axios.post(tokenURL, null, {
            params: {
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching token:', error);
        res.status(500).json({ error: 'Error fetching token' });
    }
});

const decodeUrl = (url) => url.replaceAll("%27", "'");

app.get('/proxy/IntegrationPackages', async (req, res) => {
    const { authorization, accept } = req.headers;
    const packagesUrl = req.query.packagesUrl;

    console.log("Packages URL:", packagesUrl);

    try {
        const response = await axios.get(packagesUrl, {
            headers: {
                'Authorization': authorization,
                'Accept': accept
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching Packages:', error);
        res.status(500).json({ error: 'Error fetching Package' });
    }
});


// 🧪 Existing route for previewing conversion result (no download)
app.get('/proxy/TempDownloadIflow', async (req, res) => {
    const { authorization, accept } = req.headers;
    const packagesUrl = decodeUrl(req.query.packagesUrl);
    let tempFileName = req.query.flowId;
    console.log("tempFileName : " + tempFileName);
    console.log("Iflow Temp Download URL:", packagesUrl);

    try {
        const response = await axios.get(packagesUrl, {
            headers: {
                'Authorization': authorization,
                'Accept': accept
            },
            responseType: 'arraybuffer'
        });

        const tempFolder = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder, { recursive: true });
        console.log(tempFolder);
        const safeFileName = path.basename(tempFileName.toString(), '.zip');
        const tempFilePath = path.join(tempFolder, `${safeFileName}.zip`);

        fs.writeFileSync(tempFilePath, response.data);
        console.log(`File saved to temp: ${tempFilePath}`);
        const tempExtractPath = path.join(__dirname, 'temp1', safeFileName);
        const zip = new AdmZip(tempFilePath);
        zip.extractAllTo(tempExtractPath, true);

        console.log(`Extracted to: ${tempFilePath}`);

        const baseTempFolder = path.join(__dirname, 'temp1');


        const result = runConversion(baseTempFolder, res);
        fs.unlinkSync(tempFilePath);

        // Re-zip the contents of tempExtractPath
        /*    const newZip = new AdmZip();
          newZip.addLocalFolder(tempExtractPath);
          newZip.writeZip(tempFilePath);
          console.log(`Re-zipped content saved to: ${tempFilePath}`);
  
          /* res.download(tempFilePath, `${tempFileName}.zip`, (err) => {
               if (err) {
                   console.error('Error sending file:', err);
                   res.status(500).json({ error: 'Error sending file' });
               } else {
                   console.log(`File ${tempFileName}.zip sent successfully!`);
               }
           });
          */



    } catch (error) {
        console.error('Error Downloading Flows:', error);
        res.status(500).json({ error: 'Error Downloading Flows' });
    }
});

app.get('/api/data', (req, res) => {
    console.log(req.body);
    const dataToPass = JSON.stringify(tenants);
    res.json(dataToPass);
});

app.get('/proxy/DesignTimeArtifacts', async (req, res) => {
    const { authorization, accept } = req.headers;
    const artifactsUrl = req.query.artifactsUrl;

    try {
        const response = await axios.get(artifactsUrl, {
            headers: {
                'Authorization': authorization,
                'Accept': accept
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching design-time artifacts:', error);
        res.status(500).json({ error: 'Error fetching design-time artifacts' });
    }
});

app.post('/connect', (req, res) => {
    const { hostname } = req.body; // Get the hostname from the form
    console.log('Connecting to Tenant:', hostname);

    // Log the available tenants
    console.log('Available Tenants:', tenants);

    // Find the tenant in the tenants array
    const tenantData = tenants.find(tenant => tenant.tenantName === hostname);

    if (tenantData) {
        // Perform any necessary logic to connect to the tenant
        console.log('Tenant Data:', tenantData);

        // Redirect to a different page or update the current page
        res.redirect('/'); // Adjust as needed
    } else {
        console.error('Tenant not found:', hostname);
        res.status(404).send('Tenant not found'); // Optionally, send an error response
    }
});


app.post('/downloadflowId', (req, res) => {
    const filename = req.query.flowId;
    const filePath = path.join(__dirname, 'temp', filename);

    const tempFolder = path.join(__dirname, 'temp');
    const safeFileName = path.basename(filename.toString(), '.zip');
    const tempFilePath = path.join(tempFolder, `${safeFileName}.zip`);
    const tempExtractPath = path.join(__dirname, 'temp1', safeFileName);

    const newZip = new AdmZip();
    newZip.addLocalFolder(tempExtractPath);
    newZip.writeZip(tempFilePath);
    console.log(`Re-zipped content saved to: ${tempFilePath}`);

    // Check if file exists first
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error('File not found:', filePath);
            return res.status(404).json({ message: 'File not found' });
        }

        // Stream download
        res.download(filePath, filename, (err) => {
            if (err) {
                console.error('Download error:', err);
                res.status(500).send('Failed to download file.');
            } else {
                // Delete file after download
                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) {
                        console.error('Error deleting file:', unlinkErr);
                    } else {
                        console.log('File deleted:', filename);
                    }
                });
            }
        });
    });
});





app.post('/deleteflowId', (req, res) => {
    const flowId = req.query.flowId.replace('.zip', ''); // remove .zip
    const folderPath = path.join(__dirname, 'temp1', flowId);

    try {
        fs.rmSync(folderPath, { recursive: true, force: true });  // Delete folder
        console.log(`Deleted folder: ${folderPath}`);
        return res.status(200).json({ message: 'ok' });
    } catch (err) {
        console.error('Error deleting folder:', err);
        return res.status(500).json({ error: 'Failed to delete folder' });
    }
});

app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
