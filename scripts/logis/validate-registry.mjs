#!/usr/bin/env node
import process from 'node:process'
import { loadCompanyRegistry } from './registry.mjs'

const slug = process.argv[2] ?? process.env.LOGIS_COMPANY_SLUG ?? 'hyperquote'
const company = loadCompanyRegistry(slug)
console.log(`LOGIS registry valid: ${company.slug}`)
