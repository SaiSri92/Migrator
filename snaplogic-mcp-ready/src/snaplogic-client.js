import axios from "axios";

export async function exportAssets(assetPath) {

  const url =
    "https://prod-elkjoptest-fm.snaplogic.io/api/1/rest/feed-master/queue/Elkjop-Test/VICAI/shared/Download_file_UT";


  try {

    const payload = {
      body: assetPath
    };


    const response = await axios.post(
      url,
      payload,
      {
        headers: {
          "Authorization": "Bearer 5tKpSWCfxxXnebGpswMC9ES0RIKX6tyF",
          "Content-Type": "application/json"
        },
        timeout: 120000
      }
    );

    return response.data;

  } catch (error) {

    console.error("===== SNAPLOGIC ERROR =====");

    if (error.response) {

      console.error(
        "Status:",
        error.response.status
      );

      console.error(
        "Headers:",
        JSON.stringify(
          error.response.headers,
          null,
          2
        )
      );

      console.error(
        "Response:",
        JSON.stringify(
          error.response.data,
          null,
          2
        )
      );

    } else {

      console.error(
        "Message:",
        error.message
      );

      console.error(
        "Code:",
        error.code
      );

      console.error(
        "Stack:",
        error.stack
      );
    }

    throw error;
  }
}