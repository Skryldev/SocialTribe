fn main() {
    #[cfg(target_os = "windows")]
    {
        use std::path::Path;
        
        println!("cargo:warning=Current directory: {:?}", std::env::current_dir().unwrap());
        
        let icon_path = "icon.ico";
        let path = Path::new(icon_path);
        
        if path.exists() {
            println!("cargo:warning=Icon file found at: {:?}", path.canonicalize().unwrap());
            
            let mut res = winres::WindowsResource::new();
            res.set_icon(icon_path);
            
            res.set("ProductName", "Benchmark Server");
            res.set("FileDescription", "TribeBench - Benchmark Engine Application");
            res.set("CompanyName", "Benchmark");
            
            match res.compile() {
                Ok(_) => println!("cargo:warning=Icon compiled successfully!"),
                Err(e) => println!("cargo:warning=Failed to compile icon: {}", e),
            }
        } else {
            println!("cargo:warning=Icon file NOT found at: {}", icon_path);
            println!("cargo:warning=Current directory contents:");
            if let Ok(entries) = std::fs::read_dir(".") {
                for entry in entries.flatten() {
                    println!("cargo:warning=  - {}", entry.file_name().to_string_lossy());
                }
            }
        }
    }
}