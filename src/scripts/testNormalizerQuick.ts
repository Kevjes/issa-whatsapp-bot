#!/usr/bin/env ts-node

import { QueryNormalizer } from '../utils/queryNormalizer';

const normalizer = new QueryNormalizer();

const testQueries = [
  'assurance islamique',
  'véhicule',
  'qu\'est-ce que takaful',
  'agences douala',
  'services santé',
  'protection halal'
];

console.log('\n🔬 TESTS NORMALISATION\n');

for (const query of testQueries) {
  console.log(`\n📝 "${query}"`);
  const analysis = normalizer.analyze(query);
  console.log(`   Normalisé: ${analysis.normalized}`);
  console.log(`   Mots-clés: [${analysis.keywords.join(', ')}]`);
  console.log(`   Expansion: ${analysis.keywords.length} → ${analysis.expanded.length} termes`);
  console.log(`   FTS5: ${analysis.fts5Query.substring(0, 100)}...`);
}

console.log('\n✅ Tests terminés!\n');
