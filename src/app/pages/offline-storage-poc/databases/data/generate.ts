import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { randomString } from '../helpers';

// Define interfaces that match the JSON structures
export interface Attachment {
    qwdqwdqwdqwdq: string;
    qwdqwdqwdasdfe: string;
    qwddsadasdxzc: number;
    attachment_id: string;
    efwefwefwdssfdsfdf: number;
    asdqwdedwefwfwefdfd: number;
    dsfwefdsfvwefwefweff: number;
    wfedsf: string;
    wefwfsdfsd: string;
    dfweffw: string;
    wefwefwefsdf: number;
    werwer: number;
}

export interface Support {
    support_id: string;
    attachment_id: string;
    fsfdfsdfreggr: string;
    efwefdsffe: number;
    wefwefdsfdsfwefwefef: number;
    efewfwefwefwefdsfsdfs: number;
    sdfwefwefwefwefwefdsf: number;
    dqdwqdqw: Attachment;
    section_id: string;
    name: string;
    suspension: string;
    dsfsdfwefwefwefdsffddsf: number;
    dsfwefsdfwefsdf: number;
    wefwewefwefsdf: number;
}

export interface Span {
    id: string;
    gfgnfghgcdfbdfbf: string;
    dfweffsdf: number;
    number: number;
    dsfwef: string;
    sdfzxczcxcdxcv: string;
    dfwefwefsd: number;
    dsfdsffwefwefdsfdsfef: string;
    length: number;
    fwefwefd: number;
}

export interface Section {
    section_id: string;
    gfgnfghgcdfbdfbf: string;
    sdfsdfdsfsdfsd: string;
    name: string;
    type: string;
    dsfsdfw: string;
    dsfsdfwefeff: string;
    sdfsdfsdffgfhfgdf: number;
    vdvreferfwedewf: number;
    dcsdccdcsdcdscacad: number;
    dsadadqwdwq: string[];
    sdfdggegrergerg: string[];
    searchString: string;
}

// Helper functions to generate random values
function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// function getRandomInt(min: number, max: number): number {
//     return parseFloat((Math.random() * (max - min) + min).toFixed(12));
// }

function getRandomDate(start: Date, end: Date): string {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0];
}

function generateId(prefix: string): string {
    // Generate a short ID with the given prefix
    const randomPart = Math.random().toString(36).substring(2, 10);
    return `${prefix}${randomPart}`;
}

// Generate a random dqdwqdqw
function generateAttachment(attachmentId: string): Attachment {

    return {
        qwdqwdqwdqwdq: Math.random() > 0.5 ? 'SUPENSION' : 'ANCHOR',
        qwdqwdqwdasdfe: `ATTACH${Math.random().toString(36).substring(2, 7)}`,
        qwddsadasdxzc: getRandomInt(1, 20),
        attachment_id: attachmentId,
        efwefwefwdssfdsfdf: getRandomInt(-20, 20),
        asdqwdedwefwfwefdfd: getRandomInt(1000000, 1100000),
        dsfwefdsfvwefwefweff: getRandomInt(6100000, 6200000),
        wfedsf: generateId('SET'),
        wefwfsdfsd: generateId('INS'),
        dfweffw: Math.random() > 0.5 ? 'True' : 'False',
        wefwefwefsdf: getRandomInt(100, 500),
        werwer: getRandomInt(50, 100)
    };
}

// Generate a random support
function generateSupport(sectionId: string): Support {
    const supportId = generateId('SUPP');
    const attachmentId = generateId('ATTA');

    return {
        support_id: supportId,
        attachment_id: attachmentId,
        fsfdfsdfreggr: `${Math.random().toString(36).substring(2, 12)}.tow`,
        efwefdsffe: getRandomInt(0, 360),
        wefwefdsfdsfwefwefef: getRandomInt(-20, 20),
        efewfwefwefwefdsfsdfs: getRandomInt(1000000, 1100000),
        sdfwefwefwefwefwefdsf: getRandomInt(6100000, 6200000),
        dqdwqdqw: generateAttachment(attachmentId),
        section_id: sectionId,
        name: `pole_${getRandomInt(100, 999)}`,
        suspension: Math.random() > 0.5 ? 'True' : 'False',
        dsfsdfwefwefwefdsffddsf: getRandomInt(-20, 20),
        dsfwefsdfwefsdf: getRandomInt(1, 5),
        wefwewefwefsdf: getRandomInt(5, 15)
    };
}

// Generate a random span
function generateSpan(): Span {
    const spanId = generateId('SSPAN');
    const orderNum = getRandomInt(100, 999);

    return {
        id: spanId,
        gfgnfghgcdfbdfbf: getRandomDate(new Date(2000, 0, 1), new Date(2023, 11, 31)),
        dfweffsdf: orderNum,
        number: orderNum,
        dsfwef: generateId('YPRHAL'),
        sdfzxczcxcdxcv: generateId('YPRHAL'),
        dfwefwefsd: getRandomInt(1, 10),
        dsfdsffwefwefdsfdsfef: `TEAM_${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        length: getRandomInt(100, 1000),
        fwefwefd: getRandomInt(0, 359)
    };
}

// Generate a section with its supports and spans
function generateSection(searchString: string, index: number): { section: Section, supports: Support[], spans: Span[] } {
    const sectionId = generateId('SECT');
    const numSupports = getRandomInt(5, 12);
    const numSpans = getRandomInt(4, 10);

    // Generate supports
    const supports: Support[] = [];
    const supportIds: string[] = [];

    for (let i = 0; i < numSupports; i++) {
        const support = generateSupport(sectionId);
        supports.push(support);
        supportIds.push(support.support_id);
    }

    // Generate spans
    const spans: Span[] = [];
    const spanIds: string[] = [];

    for (let i = 0; i < numSpans; i++) {
        const span = generateSpan();
        spans.push(span);
        spanIds.push(span.id);
    }

    // Generate section
    const section: Section = {
        section_id: sectionId,
        gfgnfghgcdfbdfbf: getRandomDate(new Date(2000, 0, 1), new Date(2023, 11, 31)),
        sdfsdfdsfsdfsd: generateId(''),
        name: `section_${sectionId}`,
        type: Math.random() > 0.3 ? 'PHASE' : 'GROUND',
        dsfsdfw: `${Math.random().toString(36).substring(2, 9).toUpperCase()}${getRandomInt(100, 999)}_ID`,
        dsfsdfwefeff: `${Math.random().toString(36).substring(2, 9).toUpperCase()}${getRandomInt(100, 999)}`,
        sdfsdfsdffgfhfgdf: getRandomInt(1, 3),
        vdvreferfwedewf: getRandomInt(3, 12),
        dcsdccdcsdcdscacad: getRandomInt(2, 8),
        dsadadqwdwq: supportIds,
        sdfdggegrergerg: spanIds,
        searchString: index % 100 === 0 ? searchString : randomString(10)
    };

    return { section, supports, spans };
}

// Generate multiple sections with their related data
export function generateData(numSections: number, searchString: string): { sections: Section[], supports: Support[][], spans: Span[][] } {
    // const outputDir = path.join(__dirname, '../databases/generated-data');

    // Create output directory if it doesn't exist
    // if (!fs.existsSync(outputDir)) {
    //     fs.mkdirSync(outputDir, { recursive: true });
    // }

    const sections: Section[] = [];
    const supports: Support[][] = [];
    const spans: Span[][] = [];

    for (let i = 0; i < numSections; i++) {
        const { section, supports: sectionSupports, spans: sectionSpans } = generateSection(searchString, i);
        sections.push(section);
        supports.push(sectionSupports);
        spans.push(sectionSpans);
    }

    // // Write the generated data to files
    // fs.writeFileSync(path.join(outputDir, 'sections.json'), JSON.stringify(sections, null, 2));
    // fs.writeFileSync(path.join(outputDir, 'supports.json'), JSON.stringify(supports, null, 2));
    // fs.writeFileSync(path.join(outputDir, 'spans.json'), JSON.stringify(spans, null, 2));

    // console.log(`Generated ${numSections} sections with their supports and spans.`);
    // console.log(`Total: ${sections.length} sections, ${supports.length} supports, ${spans.length} spans.`);
    return { sections, supports, spans };
}

// Execute the generator
// const numSectionsToGenerate = 5; // Change this to generate more or fewer sections
// generateData(numSectionsToGenerate);