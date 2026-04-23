using System.Net.Http;
using System.Threading.Tasks;
using System.Web.Http;
using System.Text;

namespace Backend.Controllers
{
    /// <summary>
    /// API Controller that proxies WhatsApp commands to the Node.js microservice.
    /// This ensures the frontend only talks to the .NET gateway.
    /// </summary>
    [RoutePrefix("api/whatsapp")]
    public class WhatsAppController : ApiController
    {
        private static readonly HttpClient _httpClient = new HttpClient();
        private const string NodeBaseUrl = "http://localhost:3001/api";

        /// <summary>
        /// Sends a WhatsApp message via the Node.js microservice.
        /// </summary>
        [HttpPost]
        [Route("send")]
        public async Task<IHttpActionResult> SendMessage([FromBody] dynamic payload)
        {
            var content = new StringContent(Newtonsoft.Json.JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync($"{NodeBaseUrl}/send-message", content);
            var responseString = await response.Content.ReadAsStringAsync();
            return Content(response.StatusCode, responseString);
        }

        /// <summary>
        /// Logs out and disconnects the active WhatsApp session.
        /// </summary>
        [HttpPost]
        [Route("disconnect")]
        public async Task<IHttpActionResult> Disconnect()
        {
            var response = await _httpClient.PostAsync($"{NodeBaseUrl}/session/disconnect", null);
            var responseString = await response.Content.ReadAsStringAsync();
            return Content(response.StatusCode, responseString);
        }

        /// <summary>
        /// Forcefully disconnects and deletes session data to allow a fresh QR scan.
        /// </summary>
        [HttpPost]
        [Route("reconnect")]
        public async Task<IHttpActionResult> Reconnect()
        {
            var response = await _httpClient.PostAsync($"{NodeBaseUrl}/session/reconnect", null);
            var responseString = await response.Content.ReadAsStringAsync();
            return Content(response.StatusCode, responseString);
        }
    }
}
