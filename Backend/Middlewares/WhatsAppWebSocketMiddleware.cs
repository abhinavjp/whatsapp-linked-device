using System;
using System.Collections.Generic;
using System.Net.WebSockets;
using System.Threading.Tasks;
using Microsoft.Owin;
using Backend.Protocol;

namespace Backend.Middlewares
{
    using WebSocketAccept = Action<IDictionary<string, object>, Func<IDictionary<string, object>, Task>>;

    /// <summary>
    /// Middleware that handles incoming WebSocket requests for WhatsApp functionality.
    /// It delegates the actual protocol handling to the WhatsAppProtocolWrapper proxy.
    /// </summary>
    public class WhatsAppWebSocketMiddleware : OwinMiddleware
    {
        public WhatsAppWebSocketMiddleware(OwinMiddleware next) : base(next)
        {
        }

        public override async Task Invoke(IOwinContext context)
        {
            if (context.Request.Path.Value == "/ws/whatsapp")
            {
                var acceptToken = context.Get<WebSocketAccept>("websocket.Accept");
                if (acceptToken != null)
                {
                    // Pass the WebSocket processing to our handler
                    acceptToken(null, ProcessWebSocketSession);
                    return;
                }
                else
                {
                    context.Response.StatusCode = 400;
                    context.Response.ReasonPhrase = "Bad Request";
                    await context.Response.WriteAsync("Not a valid websocket request");
                    return;
                }
            }

            await Next.Invoke(context);
        }

        private async Task ProcessWebSocketSession(IDictionary<string, object> wsEnv)
        {
            var wsContext = (WebSocketContext)wsEnv["System.Net.WebSockets.WebSocketContext"];
            var webSocket = wsContext.WebSocket;

            // Use the Proxy pattern to delegate all traffic to the Node.js microservice
            var protocolWrapper = new WhatsAppProtocolWrapper(webSocket);
            await protocolWrapper.StartProxyAsync();
        }
    }
}
