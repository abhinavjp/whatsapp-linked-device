using System;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web.Http;
using System.Text;

namespace Backend.Controllers
{
    public class MessagePayload
    {
        public string to { get; set; }
        public string text { get; set; }
    }

    /// <summary>
    /// API Controller that proxies WhatsApp commands to the Node.js microservice.
    /// This ensures the frontend only talks to the .NET gateway.
    /// </summary>
    [RoutePrefix("api/whatsapp")]
    public class WhatsAppController : ApiController
    {
        private static readonly HttpClient _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        private const string NodeBaseUrl = "http://localhost:3001/api";

        private void LogToFile(string message)
        {
            try
            {
                var logPath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..\\..\\..\\backend.log");
                System.IO.File.AppendAllText(logPath, $"[{DateTime.Now:HH:mm:ss}] {message}{Environment.NewLine}");
            }
            catch { /* Ignore logging errors */ }
        }

        /// <summary>
        /// Sends a WhatsApp message via the Node.js microservice.
        /// </summary>
        [HttpPost]
        [Route("send")]
        public async Task<IHttpActionResult> SendMessage([FromBody] MessagePayload payload)
        {
            LogToFile($"Proxying send-message request to Node.js for: {payload?.to}");
            try
            {
                var content = new StringContent(Newtonsoft.Json.JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync($"{NodeBaseUrl}/send-message", content);
                var responseString = await response.Content.ReadAsStringAsync();
                
                LogToFile($"Node.js returned status: {response.StatusCode}. Content: {responseString}");
                return Content(response.StatusCode, responseString);
            }
            catch (Exception ex)
            {
                LogToFile($"Error proxying send-message: {ex.Message}");
                return InternalServerError(ex);
            }
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
