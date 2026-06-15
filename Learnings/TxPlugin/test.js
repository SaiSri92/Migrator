const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

// Paths to the text files to add to the .iflw file
let __dirname1 = __dirname + "/scripts/"
console.log(__dirname1);
const collaborationContent = fs.readFileSync(path.join(__dirname1, 'codeadder', 'colloboration.txt'), 'utf8');
const diagramContent = fs.readFileSync(path.join(__dirname1, 'codeadder', 'diagram.txt'), 'utf8');
const processContent = fs.readFileSync(path.join(__dirname1, 'codeadder', 'process.txt'), 'utf8');


function insertContentToXML(filePath) {
  fs.readFile(filePath, 'utf8', (err, xmlData) => {
    if (err) {
      console.log(`❌ Error reading ${filePath}:`, err);
      return;
    }

    const parser = new xml2js.Parser({ explicitArray: true });
    const builder = new xml2js.Builder({ headless: false, renderOpts: { pretty: true } });
    const tags = ["bpmn2:collaboration", "bpmndi:BPMNDiagram", "bpmn2:process"];
    
      parser.parseString(xmlData, (err, result) => {
        if (err) {
          console.log(`❌ Error parsing original XML:`, err);
          return;
        }

        const targetTag = result["bpmn2:definitions"];


        tags.forEach(tagName => {
      let contentXml;
      console.log("filePath is being oricessed " + filePath + " Processing thge tag "+ tagName)

      if (tagName === "bpmn2:collaboration")
        contentXml = collaborationContent;
      else if (tagName === "bpmndi:BPMNDiagram")
        contentXml = diagramContent;
      else if (tagName === "bpmn2:process")
        contentXml = processContent;

        const safeXmlToParse = `<wrapper>${contentXml}</wrapper>`;

        parser.parseString(safeXmlToParse, (err, parsedInsert) => {
          if (err) {
            console.log(`❌ Error parsing contentXml:`, err);
            return;
          }

          if (tagName === "bpmn2:process") {
            parsedInsert.wrapper["bpmn2:process"].forEach(childtag => {
              if (childtag)
                targetTag["bpmn2:process"] = (targetTag["bpmn2:process"] || []).concat(childtag);
            });

            targetTag["bpmn2:process"].forEach(childtag => {
              if (childtag)
                console.log("ID is : " + JSON.stringify(childtag.$.id) + "   name is : " + JSON.stringify(childtag.$.name));
            });

          } else if (tagName === "bpmn2:collaboration") {
            const safeXmlToParse2 = `<wrapper>${contentXml}</wrapper>`;
            const possibleTags = [
              "bpmn2:extensionElements",
              "bpmn2:participant",
              "bpmn2:messageFlow"
            ];

            possibleTags.forEach(tag => {
              const sourceItems = parsedInsert.wrapper?.[tag];
              if (Array.isArray(sourceItems)) {
                targetTag["bpmn2:collaboration"][0][tag] = (targetTag["bpmn2:collaboration"][0][tag] || []).concat(sourceItems);
              }
            });



          }else if (tagName === "bpmndi:BPMNDiagram") {

            const safeXmlToParse2 = `<wrapper>${contentXml}</wrapper>`;
            const possibleTags = [
              "bpmndi:BPMNShape",
              "bpmndi:BPMNEdge"
            ];

            possibleTags.forEach(tag => {
              const sourceItems = parsedInsert.wrapper?.[tag];
              //console.log(JSON.stringify(targetTag["bpmndi:BPMNDiagram"][0]["bpmndi:BPMNPlane"][0][tag],null,2).toString().substring(0,10000));
             if (Array.isArray(sourceItems)) {
                targetTag["bpmndi:BPMNDiagram"][0]["bpmndi:BPMNPlane"][0][tag] = (targetTag["bpmndi:BPMNDiagram"][0]["bpmndi:BPMNPlane"][0][tag] || []).concat(sourceItems);
              }
            });




          }
         
        });
         });

        // ✅ Common write step: Write to the same file for both tag types
        // const finalXml = builder.buildObject(result);
         fs.writeFileSync("scriptsl2.xml", builder.buildObject(targetTag), 'utf8');
      });





  });
}



function processIFLWFile(iflwFilePath) {
  insertContentToXML(iflwFilePath);
  //  insertContentToXML(iflwFilePath, 'bpmndi:BPMNDiagram', diagramContent);
  //insertContentToXML(iflwFilePath, 'bpmn2:process', processContent);
}

function searchFiles(dir, filename, found = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      searchFiles(fullPath, filename, found);
    } else if (file === filename || file.endsWith(filename)) {
      found.push(fullPath);
    }
  }
  return found;
}
const iflwFiles = searchFiles(path.join(__dirname1, 'codeadder'), '.iflw');
iflwFiles.forEach(iflwFilePath => {
  console.log(`Processing ${iflwFilePath}`);
  processIFLWFile(iflwFilePath);
});