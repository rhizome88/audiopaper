import CloudConvert from 'cloudconvert';

export async function convertDocxToPdf(
  apiKey: string,
  fileBuffer: Buffer,
  fileName: string
): Promise<ArrayBuffer> {
  const cloudConvert = new CloudConvert(apiKey);

  // Validate file name
  const fileNameLower = fileName.toLowerCase();
  if (!fileNameLower.endsWith('.docx') && !fileNameLower.endsWith('.doc')) {
    throw new Error('Only .doc and .docx files are supported');
  }

  // Create a job with upload, convert, and export tasks
  const job = await cloudConvert.jobs.create({
    tasks: {
      'upload-file': {
        operation: 'import/upload',
      },
      'convert-file': {
        operation: 'convert',
        input: ['upload-file'],
        output_format: 'pdf',
      },
      'export-file': {
        operation: 'export/url',
        input: ['convert-file'],
        inline: false,
        archive_multiple_files: false,
      },
    },
  });

  // Get the upload task
  const uploadTask = job.tasks.find((task) => task.name === 'upload-file');
  if (!uploadTask) {
    throw new Error('Upload task not found');
  }

  // Upload the file
  await cloudConvert.tasks.upload(uploadTask, new Blob([fileBuffer]), fileName);

  // Wait for the job to complete
  const completedJob = await cloudConvert.jobs.wait(job.id);

  // Get the export task result
  const exportTask = completedJob.tasks.find(
    (task) => task.name === 'export-file' && task.status === 'finished'
  );

  if (!exportTask || !exportTask.result?.files?.[0]?.url) {
    throw new Error('Conversion failed - no output file');
  }

  // Download the converted PDF
  const pdfUrl = exportTask.result.files[0].url;
  const pdfResponse = await fetch(pdfUrl);
  const pdfBuffer = await pdfResponse.arrayBuffer();

  return pdfBuffer;
}
