export function isPreviewableFile(fileName: string): boolean {
    const previewableExtensions = [
        'txt', 'html', 'css', 'js', 'json', 'xml',
        'md', 'py', 'java', 'c', 'cpp', 'h', 'hpp',
        'ts', 'tsx', 'jsx', 'php', 'rb', 'sh',
        'yaml', 'yml', 'ini', 'conf', 'env'
    ];

    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ? previewableExtensions.includes(extension) : false;
} 