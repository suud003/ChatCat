using System;
using System.Text;
using System.Diagnostics;
using System.Runtime.InteropServices;
class Program {
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern int GetWindowThreadProcessId(IntPtr hWnd, out int pid);
  [DllImport("user32.dll", CharSet=CharSet.Auto)] static extern int GetWindowText(IntPtr hWnd, StringBuilder sb, int maxCount);
  [DllImport("user32.dll")] static extern int GetWindowTextLength(IntPtr hWnd);
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr hWnd, uint uCmd);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(int access, bool inherit, int pid);
  [DllImport("kernel32.dll", CharSet=CharSet.Auto)] static extern bool QueryFullProcessImageName(IntPtr hProcess, int flags, StringBuilder name, ref int size);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  static string Esc(string s) {
    if (s == null) return "";
    return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", " ").Replace("\r", "");
  }
  static string GetProc(int pid) {
    IntPtr h = OpenProcess(0x1000, false, pid);
    if (h != IntPtr.Zero) {
      StringBuilder nb = new StringBuilder(1024);
      int ns = nb.Capacity;
      if (QueryFullProcessImageName(h, 0, nb, ref ns)) { CloseHandle(h); return System.IO.Path.GetFileNameWithoutExtension(nb.ToString()); }
      CloseHandle(h);
    }
    try { return Process.GetProcessById(pid).ProcessName; } catch { return ""; }
  }
  static void Main(string[] args) {
    int exPid = 0;
    for (int i = 0; i < args.Length; i++)
      if (args[i] == "--exclude-pid" && i+1 < args.Length) int.TryParse(args[i+1], out exPid);
    IntPtr hwnd = GetForegroundWindow();
    int pid = 0;
    GetWindowThreadProcessId(hwnd, out pid);
    if (exPid > 0 && pid == exPid) {
      IntPtr next = hwnd;
      for (int i = 0; i < 50; i++) {
        next = GetWindow(next, 2);
        if (next == IntPtr.Zero) break;
        if (!IsWindowVisible(next)) continue;
        if (GetWindowTextLength(next) == 0) continue;
        int np = 0; GetWindowThreadProcessId(next, out np);
        if (np == exPid) continue;
        hwnd = next; pid = np; break;
      }
    }
    int len = GetWindowTextLength(hwnd);
    StringBuilder sb = new StringBuilder(len + 1);
    GetWindowText(hwnd, sb, sb.Capacity);
    Console.WriteLine("{\"N\":\"" + Esc(GetProc(pid)) + "\",\"T\":\"" + Esc(sb.ToString()) + "\"}");
  }
}
