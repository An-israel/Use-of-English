/* eslint-disable @next/next/no-head-element -- email HTML, not a Next.js page */
import type { ReactNode } from "react";
import { siteUrl } from "@/lib/env";

/* Email-safe layout: tables and inline styles only, in the JHTS palette (flyer colours). */
const serif = "Georgia, 'Times New Roman', serif";
const sans = "Arial, Helvetica, sans-serif";

export function Layout({ preview, title, children }: { preview: string; title: string; children: ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width" />
        <title>{title}</title>
      </head>
      <body style={{ margin: 0, background: "#FAF7EE", fontFamily: serif, color: "#1C211D" }}>
        <div style={{ display: "none", maxHeight: 0, overflow: "hidden" }}>{preview}</div>
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ background: "#FAF7EE", padding: "32px 16px" }}
        >
          <tbody>
            <tr>
              <td align="center">
                <table
                  role="presentation"
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{ maxWidth: 560, background: "#FFFDF7", border: "1px solid #E5DFCD" }}
                >
                  <tbody>
                    <tr>
                      <td style={{ background: "#14452F", padding: "20px 32px", borderBottom: "3px solid #E1B521" }}>
                        <table role="presentation" cellPadding={0} cellSpacing={0}>
                          <tbody>
                            <tr>
                              <td style={{ paddingRight: 14, verticalAlign: "middle" }}>
                                {/* eslint-disable-next-line @next/next/no-img-element -- email HTML */}
                                <img
                                  src={`${siteUrl}/brand/emblem-512.png`}
                                  width={56}
                                  height={56}
                                  alt="JHTS emblem"
                                  style={{ display: "block", border: 0 }}
                                />
                              </td>
                              <td style={{ verticalAlign: "middle" }}>
                                <div style={{ fontSize: 26, fontWeight: "bold", color: "#FAF7EE" }}>JHTS</div>
                                <div
                                  style={{
                                    fontFamily: sans,
                                    fontSize: 10,
                                    letterSpacing: 2,
                                    color: "#E9E2C8",
                                    textTransform: "uppercase",
                                    marginTop: 4,
                                  }}
                                >
                                  Journal of Humanities and Transcultural Studies
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: 32 }}>
                        <h1 style={{ fontSize: 24, lineHeight: 1.25, fontWeight: "normal", margin: "0 0 16px" }}>
                          {title}
                        </h1>
                        {children}
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          padding: "18px 32px",
                          borderTop: "1px solid #E5DFCD",
                          fontFamily: sans,
                          fontSize: 12,
                          lineHeight: 1.6,
                          color: "#6A6A5C",
                        }}
                      >
                        The Use of English Unit, School of General Studies, University of Nigeria, Nsukka
                        <br />
                        Knowledge · Cultures · Global Voices ·{" "}
                        <a href={`${siteUrl}/contact`} style={{ color: "#14452F" }}>
                          Contact the editorial office
                        </a>
                        <br />
                        Payment of fees does not guarantee acceptance. All editorial decisions are based solely on
                        scholarly merit.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export const P = ({ children }: { children: ReactNode }) => (
  <p style={{ fontSize: 16, lineHeight: 1.65, margin: "0 0 12px" }}>{children}</p>
);

export const Button = ({ href, children }: { href: string; children: ReactNode }) => (
  <p style={{ margin: "26px 0" }}>
    <a
      href={href}
      style={{
        display: "inline-block",
        background: "#14452F",
        color: "#FFFDF7",
        textDecoration: "none",
        fontFamily: sans,
        fontSize: 15,
        padding: "13px 24px",
        borderRadius: 2,
      }}
    >
      {children}
    </a>
  </p>
);

export const Facts = ({ rows }: { rows: [string, string][] }) => (
  <table
    role="presentation"
    cellPadding={0}
    cellSpacing={0}
    style={{ width: "100%", margin: "8px 0 16px", fontFamily: sans, fontSize: 14 }}
  >
    <tbody>
      {rows.map(([k, v]) => (
        <tr key={k}>
          <td style={{ padding: "7px 0", color: "#6A6A5C", borderBottom: "1px solid #E5DFCD", width: "42%" }}>{k}</td>
          <td style={{ padding: "7px 0", borderBottom: "1px solid #E5DFCD" }}>{v}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
