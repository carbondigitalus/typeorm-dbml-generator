// Custom Modules
import GeneratorOptions from './GeneratorOptions';

export default interface Config {
    input: string | string[];
    output?: string;
    exclude?: string | string[];
    projectName?: string;
    options?: GeneratorOptions;
}
