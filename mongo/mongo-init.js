/**
 * Roda uma única vez, quando o volume do MongoDB está vazio.
 * Só cria o banco; coleções e índices ficam a cargo dos modelos do backend.
 */
db = db.getSiblingDB(process.env.MONGO_INITDB_DATABASE || 'contopia');
db.createCollection('users');
print('Contopia: banco inicializado');
