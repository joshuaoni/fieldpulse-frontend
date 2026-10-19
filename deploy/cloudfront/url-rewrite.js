// CloudFront Function — attach as a *viewer request* function on the default
// behavior (and on /integrations/chatwoot*). Runtime: cloudfront-js-2.0.
//
// Next's static export writes one file per route: /today → /today.html,
// /visits → /visits.html, / → /index.html. S3 has no notion of "clean URLs",
// so this maps the request the browser makes onto the object that exists.
//
// Query strings are left untouched — /visits?id=abc must still reach
// /visits.html with ?id=abc available to the client.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- CloudFront calls the global `handler`.
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Root and anything that already has a file extension are served as-is.
  if (uri === "/" || uri.split("/").pop().indexOf(".") !== -1) {
    return request;
  }

  // Trailing slash → drop it. `trailingSlash` is off in next.config.ts, so
  // /today/ has no matching object; /today.html does.
  if (uri.charAt(uri.length - 1) === "/") {
    uri = uri.slice(0, -1);
  }

  request.uri = uri + ".html";
  return request;
}
