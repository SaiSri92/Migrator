const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const archiver = require('archiver');

// Paths to the text files to add to the .iflw file
const collaborationContent = fs.readFileSync(path.join(__dirname, 'codeadder', 'colloboration.txt'), 'utf8');
const diagramContent = fs.readFileSync(path.join(__dirname, 'codeadder', 'diagram.txt'), 'utf8');
const processContent = fs.readFileSync(path.join(__dirname, 'codeadder', 'process.txt'), 'utf8');

const PROP_CONTENT = `#New changes
credential=Test_Cred
Log=X
host=Test_Host
Topic=Test_topic`;

const PROPDEF_CONTENT = `<parameters><parameter>
    <key/>
    <name>Log</name>
    <type>xsd:string</type>
    <isRequired>false</isRequired>
    <constraint/>
    <description/>
    <additionalMetadata/>
  </parameter><parameter>
    <key/>
    <name>host</name>
    <type>xsd:string</type>
    <isRequired>false</isRequired>
    <constraint/>
    <description/>
    <additionalMetadata/>
  </parameter><parameter>
    <key/>
    <name>credential</name>
    <type>xsd:string</type>
    <isRequired>false</isRequired>
    <constraint/>
    <description/>
    <additionalMetadata/>
  </parameter><parameter>
    <key/>
    <name>Topic</name>
    <type>xsd:string</type>
    <isRequired>false</isRequired>
    <constraint/>
    <description/>
    <additionalMetadata/>
  </parameter><param_references><reference attribute_category="Receiver1" attribute_id="ctype::AdapterVariant/cname::Kafka/tp::TCP/mp::Kafka/direction::Receiver/version::1.1.0/attrId::hosts" attribute_uilabel="" param_key="host"/><reference attribute_category="Receiver1" attribute_id="ctype::AdapterVariant/cname::Kafka/tp::TCP/mp::Kafka/direction::Receiver/version::1.1.0/attrId::topic" attribute_uilabel="Topic" param_key="Topic"/><reference attribute_category="Receiver1.Receiver.Auth" attribute_id="ctype::AdapterVariant/cname::Kafka/tp::TCP/mp::Kafka/direction::Receiver/version::1.1.0/attrId::credentialName" attribute_uilabel="Credential Name" param_key="credential"/></param_references></parameters>`;

function checkContentExists(xml, tagName, content) {
  const tag = xml[tagName];
  if (tag && tag.some(item => item === content)) {
    return true;
  }
  return false;
}

function fileHasEntries(filePath, entries) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return entries.every(entry => fileContent.includes(entry));
  } catch (err) {
    return false;
  }
}

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
       // console.log("filePath is being oricessed " + filePath + " Processing thge tag " + tagName)

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
          } else if (tagName === "bpmndi:BPMNDiagram") {

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
      // fs.writeFileSync("scriptsl2.xml", builder.buildObject(targetTag), 'utf8');
      const updatedXml = builder.buildObject({
        "bpmn2:definitions": targetTag
      });
      fs.writeFileSync(filePath, updatedXml, 'utf8');
    });

  });
}


function processIFLWFile(iflwFilePath) {
  insertContentToXML(iflwFilePath);
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

function ensureFileWithContent(filePath, content, isPropDef = false) {
  if (fs.existsSync(filePath)) {
    const currentContent = fs.readFileSync(filePath, 'utf8');

    if (isPropDef) {
      // Parse the current XML content
      xml2js.parseString(currentContent, (err, existingObj) => {
        if (err) {
          console.error('❌ Error parsing existing XML:', err);
          return;
        }

        // Parse the new content that we want to append
        xml2js.parseString(content.replace(/<\?xml .*?\?>/, ''), (err2, newContentObj) => {
          if (err2) {
            console.error('❌ Error parsing new content XML:', err2);
            return;
          }

          // Ensure <parameters> node exists
          if (!existingObj.parameters) {
            existingObj.parameters = {};
          }

          if (!existingObj.parameters.parameter) {
            existingObj.parameters.parameter = [];
          }

          if (!existingObj.parameters.param_references) {
            existingObj.parameters.param_references = [];
          }

          // Ensure that newParams is always treated as an array
          const newParams = Array.isArray(newContentObj.parameters)
            ? newContentObj.parameters
            : newContentObj.parameters ? [newContentObj.parameters] : [];



          // Append <parameter> elements if they don't exist already
          newParams.forEach(newParam => {
            const paramName = newParam.parameter.name;
            if (!existingObj.parameters.parameter.some(param => param.name[0] === paramName)) {
              newParam.parameter.forEach(par => {
                existingObj.parameters.parameter.push(par);
              })
            }
          });



          // Append <param_references> elements if they don't exist already
          const existingRefArray = existingObj.parameters.param_references[0].reference || [];
          const newReferences = newParams[0].param_references[0].reference || [];

          newReferences.forEach(newRef => {
            const newKey = newRef.$?.param_key;
            const alreadyExists = existingRefArray.some(ref => ref.$?.param_key === newKey);
            if (!alreadyExists) {
              existingRefArray.push(newRef);
            }
          });



          // Rebuild the XML content with the updated parameters and references
          const builder = new xml2js.Builder({
            headless: true, // Prevents the XML declaration from being added again
            renderOpts: { pretty: true },
          });
          const updatedXML = builder.buildObject(existingObj);

          // Ensure the original XML declaration is kept as is
          if (currentContent.startsWith('<?xml')) {
            const xmlDeclaration = currentContent.match(/<\?xml.*?\?>/)[0];
            const finalXML = `${xmlDeclaration}\n${updatedXML.replace(/<\?xml.*?\?>\n/, '')}`;

            fs.writeFileSync(filePath, finalXML, 'utf8');
          } else {
            fs.writeFileSync(filePath, updatedXML, 'utf8');
          }

          console.log(`✅ Appended to: ${filePath}`);
        });
      });
    } else {
      // Plain string append for .prop file
      const newContent = currentContent.trimEnd() + content;
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Appended to: ${filePath}`);
    }
  } else {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const finalContent = isPropDef
      ? `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${content}`
      : content;
    fs.writeFileSync(filePath, finalContent.trim(), 'utf8');
    console.log(`✅ Created new: ${filePath}`);
  }
}



function runConversion(extractedFolderPath, res) {
  const props = searchFiles(extractedFolderPath, 'parameters.prop');
  const propdefs = searchFiles(extractedFolderPath, 'parameters.propdef');

  const targetProp = path.join(extractedFolderPath, 'resources', 'parameters.prop');
  const targetPropdef = path.join(extractedFolderPath, 'resources', 'parameters.propdef');

  if (props.length === 0) {
    ensureFileWithContent(targetProp, PROP_CONTENT);
  } else {
    props.forEach(file => ensureFileWithContent(file, PROP_CONTENT));
  }

  if (propdefs.length === 0) {
    ensureFileWithContent(targetPropdef, PROPDEF_CONTENT, true);
  } else {
    propdefs.forEach(file => ensureFileWithContent(file, PROPDEF_CONTENT, true));
  }

  const iflwFiles = searchFiles(extractedFolderPath, '.iflw');
  iflwFiles.forEach(iflwFilePath => {
    console.log(`Processing ${iflwFilePath}`);
    processIFLWFile(iflwFilePath);
  });

}

module.exports = { runConversion };
