# Claude Code: "token expired" / login fails (IPv6)

_Recorded 2026-10-19 — on the development laptop, not the app._

**Problem:** Claude Code kept saying "token expired" and login failed. The network's IPv6 was broken, so Claude Code's connections timed out (`ETIMEDOUT`), even though the browser login worked.

**Solution:** Disabled IPv6, forcing the working IPv4 route, then logged in again. Made it permanent with a config file.
