import Foundation
import Capacitor
import AuthenticationServices

/// Capacitor plugin wrapping ASWebAuthenticationSession for OAuth.
@objc(AuthBrowserPlugin)
public class AuthBrowserPlugin: CAPPlugin, ASWebAuthenticationPresentationContextProviding {

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        guard let window = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .flatMap({ $0.windows })
            .first(where: { $0.isKeyWindow }) else {
            return UIApplication.shared.windows.first!
        }
        return window
    }

    @objc func open(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"),
              let url = URL(string: urlString),
              let scheme = call.getString("callbackScheme") else {
            call.reject("Missing required parameters: url, callbackScheme")
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: scheme
            ) { callbackURL, error in
                if let error = error as? ASWebAuthenticationSessionError,
                   error.code == .canceledLogin {
                    call.reject("User cancelled login")
                    return
                }
                if let error = error {
                    call.reject(error.localizedDescription)
                    return
                }
                guard let callbackURL = callbackURL else {
                    call.reject("No callback URL received")
                    return
                }
                call.resolve(["url": callbackURL.absoluteString])
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            session.start()
        }
    }
}
