using System;
using System.Collections.Generic;
using System.Net.WebSockets;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Owin;
using Backend.Protocol;

namespace Backend.Middlewares
{
    using WebSocketAccept = Action<IDictionary<string, object>, Func<IDictionary<string, object>, Task>>;

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

            var protocolWrapper = new WhatsAppProtocolWrapper(webSocket);
            await protocolWrapper.StartHandshakeAsync();

            var buffer = new byte[4096];
            while (webSocket.State == WebSocketState.Open)
            {
                var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                
                if (result.MessageType == WebSocketMessageType.Close)
                {
                    await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
                }
                else
                {
                    await protocolWrapper.HandleIncomingMessageAsync(buffer, result.Count, result.MessageType);
                }
            }
        }
    }
}
