using System;
using System.Web.Http;
using Microsoft.Owin.Hosting;
using Owin;

namespace Backend
{
    public class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            // Configure Web API for self-host. 
            HttpConfiguration config = new HttpConfiguration();

            // Enable CORS
            app.UseCors(Microsoft.Owin.Cors.CorsOptions.AllowAll);

            // Register WhatsApp WebSocket Middleware
            app.Use<Backend.Middlewares.WhatsAppWebSocketMiddleware>();

            // Web API routes
            config.MapHttpAttributeRoutes();

            config.Routes.MapHttpRoute(
                name: "DefaultApi",
                routeTemplate: "api/{controller}/{id}",
                defaults: new { id = RouteParameter.Optional }
            );

            app.UseWebApi(config);
        }
    }

    class Program
    {
        static void Main(string[] args)
        {
            string baseAddress = "http://localhost:9000/";

            // Start OWIN host 
            using (WebApp.Start<Startup>(url: baseAddress))
            {
                Console.WriteLine($"Server is running on {baseAddress}");
                Console.WriteLine("Press [Enter] to quit.");
                Console.ReadLine();
            }
        }
    }
}
