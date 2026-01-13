import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Script para reemplazar todos los clientes Neon directos con el import centralizado
// que tiene disableWarningInBrowsers: true configurado

const NEON_IMPORT_PATTERN = /import\s+{\s*neon\s*}\s+from\s+['"]@neondatabase\/serverless['"]/g;
const NEON_CLIENT_PATTERN = /const\s+sql\s*=\s*neon$$process\.env\.DATABASE_URL!$$/g;

const REPLACEMENT = "import { sql } from '@/lib/db'";

function processFile(filePath) {
  try {
    let content = readFileSync(filePath, 'utf8');
    let changed = false;
    
    // Reemplazar el import de Neon
    if (NEON_IMPORT_PATTERN.test(content)) {
      content = content.replace(NEON_IMPORT_PATTERN, REPLACEMENT);
      changed = true;
    }
    
    // Eliminar la línea donde se crea el cliente
    if (NEON_CLIENT_PATTERN.test(content)) {
      content = content.replace(NEON_CLIENT_PATTERN, '// Using centralized DB client from @/lib/db');
      changed = true;
    }
    
    if (changed) {
      writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return 1;
    }
    
    return 0;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

function processDirectory(dirPath, pattern = /\.(ts|tsx)$/) {
  let count = 0;
  
  try {
    const entries = readdirSync(dirPath);
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!entry.startsWith('.') && entry !== 'node_modules') {
          count += processDirectory(fullPath, pattern);
        }
      } else if (pattern.test(entry)) {
        count += processFile(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error.message);
  }
  
  return count;
}

// Procesar directorios
console.log('🔧 Replacing Neon clients with centralized import...\n');

const apiCount = processDirectory('app/api');
const libCount = processDirectory('lib');

console.log(`\n✨ Done! Fixed ${apiCount + libCount} files`);
console.log(`   - API routes: ${apiCount}`);
console.log(`   - Library files: ${libCount}`);
