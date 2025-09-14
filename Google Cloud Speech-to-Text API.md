以下是Google Cloud Speech-to-Text文档，供参考。V2和V1两个版本，使用V2.

————以下是V2————
## Method: projects.locations.recognizers.recognize

bookmark_border
Performs synchronous Speech recognition: receive results after all audio has been sent and processed.

HTTP request
POST https://{endpoint}/v2/{recognizer=projects/*/locations/*/recognizers/*}:recognize

Where {endpoint} is one of the supported service endpoints.

The URLs use gRPC Transcoding syntax.

Path parameters
Parameters
recognizer	
string

Required. The name of the Recognizer to use during recognition. The expected format is projects/{project}/locations/{location}/recognizers/{recognizer}. The {recognizer} segment may be set to _ to use an empty implicit Recognizer.

Request body
The request body contains data with the following structure:

JSON representation

{
  "config": {
    object (RecognitionConfig)
  },
  "configMask": string,

  // Union field audio_source can be only one of the following:
  "content": string,
  "uri": string
  // End of list of possible types for union field audio_source.
}
Fields
config	
object (RecognitionConfig)

Features and audio metadata to use for the Automatic Speech Recognition. This field in combination with the configMask field can be used to override parts of the defaultRecognitionConfig of the Recognizer resource.

configMask	
string (FieldMask format)

The list of fields in config that override the values in the defaultRecognitionConfig of the recognizer during this recognition request. If no mask is provided, all non-default valued fields in config override the values in the recognizer for this recognition request. If a mask is provided, only the fields listed in the mask override the config in the recognizer for this recognition request. If a wildcard (*) is provided, config completely overrides and replaces the config in the recognizer for this recognition request.

This is a comma-separated list of fully qualified names of fields. Example: "user.displayName,photo".

Union field audio_source. The audio source, which is either inline content or a Google Cloud Storage URI. audio_source can be only one of the following:
content	
string (bytes format)

The audio data bytes encoded as specified in RecognitionConfig. As with all bytes fields, proto buffers use a pure binary representation, whereas JSON representations use base64.

A base64-encoded string.

uri	
string

URI that points to a file that contains audio data bytes as specified in RecognitionConfig. The file must not be compressed (for example, gzip). Currently, only Google Cloud Storage URIs are supported, which must be specified in the following format: gs://bucket_name/object_name (other URI formats return INVALID_ARGUMENT). For more information, see Request URIs.

Response body
Response message for the recognizers.recognize method.

If successful, the response body contains data with the following structure:

JSON representation

{
  "results": [
    {
      object (SpeechRecognitionResult)
    }
  ],
  "metadata": {
    object (RecognitionResponseMetadata)
  }
}
Fields
results[]	
object (SpeechRecognitionResult)

Sequential list of transcription results corresponding to sequential portions of audio.

metadata	
object (RecognitionResponseMetadata)

Metadata about the recognition.

Authorization scopes
Requires the following OAuth scope:

https://www.googleapis.com/auth/cloud-platform
For more information, see the Authentication Overview.

IAM Permissions
Requires the following IAM permission on the recognizer resource:

speech.recognizers.recognize
For more information, see the IAM documentation.

SpeechRecognitionResult
A speech recognition result corresponding to a portion of the audio.

JSON representation

{
  "alternatives": [
    {
      object (SpeechRecognitionAlternative)
    }
  ],
  "channelTag": integer,
  "resultEndOffset": string,
  "languageCode": string
}
Fields
alternatives[]	
object (SpeechRecognitionAlternative)

May contain one or more recognition hypotheses. These alternatives are ordered in terms of accuracy, with the top (first) alternative being the most probable, as ranked by the recognizer.

channelTag	
integer

For multi-channel audio, this is the channel number corresponding to the recognized result for the audio from that channel. For audioChannelCount = N, its output values can range from 1 to N.

resultEndOffset	
string (Duration format)

Time offset of the end of this result relative to the beginning of the audio.

A duration in seconds with up to nine fractional digits, ending with 's'. Example: "3.5s".

languageCode	
string

Output only. The BCP-47 language tag of the language in this result. This language code was detected to have the most likelihood of being spoken in the audio.

SpeechRecognitionAlternative
Alternative hypotheses (a.k.a. n-best list).

JSON representation

{
  "transcript": string,
  "confidence": number,
  "words": [
    {
      object (WordInfo)
    }
  ]
}
Fields
transcript	
string

Transcript text representing the words that the user spoke.

confidence	
number

The confidence estimate between 0.0 and 1.0. A higher number indicates an estimated greater likelihood that the recognized words are correct. This field is set only for the top alternative of a non-streaming result or, of a streaming result where isFinal is set to true. This field is not guaranteed to be accurate and users should not rely on it to be always provided. The default of 0.0 is a sentinel value indicating confidence was not set.

words[]	
object (WordInfo)

A list of word-specific information for each recognized word. When the SpeakerDiarizationConfig is set, you will see all the words from the beginning of the audio.

WordInfo
Word-specific information for recognized words.

JSON representation

{
  "startOffset": string,
  "endOffset": string,
  "word": string,
  "confidence": number,
  "speakerLabel": string
}
Fields
startOffset	
string (Duration format)

Time offset relative to the beginning of the audio, and corresponding to the start of the spoken word. This field is only set if enableWordTimeOffsets is true and only in the top hypothesis. This is an experimental feature and the accuracy of the time offset can vary.

A duration in seconds with up to nine fractional digits, ending with 's'. Example: "3.5s".

endOffset	
string (Duration format)

Time offset relative to the beginning of the audio, and corresponding to the end of the spoken word. This field is only set if enableWordTimeOffsets is true and only in the top hypothesis. This is an experimental feature and the accuracy of the time offset can vary.

A duration in seconds with up to nine fractional digits, ending with 's'. Example: "3.5s".

word	
string

The word corresponding to this set of information.

confidence	
number

The confidence estimate between 0.0 and 1.0. A higher number indicates an estimated greater likelihood that the recognized words are correct. This field is set only for the top alternative of a non-streaming result or, of a streaming result where isFinal is set to true. This field is not guaranteed to be accurate and users should not rely on it to be always provided. The default of 0.0 is a sentinel value indicating confidence was not set.

speakerLabel	
string

A distinct label is assigned for every speaker within the audio. This field specifies which one of those speakers was detected to have spoken this word. speakerLabel is set if SpeakerDiarizationConfig is given and only in the top alternative.

RecognitionResponseMetadata
Metadata about the recognition request and response.

JSON representation

{
  "requestId": string,
  "totalBilledDuration": string
}
Fields
requestId	
string

Global request identifier auto-generated by the API.

totalBilledDuration	
string (Duration format)

When available, billed audio seconds for the corresponding request.

A duration in seconds with up to nine fractional digits, ending with 's'. Example: "3.5s".

——————

## Method: projects.locations.recognizers.batchRecognize

bookmark_border
Performs batch asynchronous speech recognition: send a request with N audio files and receive a long running operation that can be polled to see when the transcriptions are finished.

HTTP request
POST https://{endpoint}/v2/{recognizer=projects/*/locations/*/recognizers/*}:batchRecognize

Where {endpoint} is one of the supported service endpoints.

The URLs use gRPC Transcoding syntax.

Path parameters
Parameters
recognizer	
string

Required. The name of the Recognizer to use during recognition. The expected format is projects/{project}/locations/{location}/recognizers/{recognizer}. The {recognizer} segment may be set to _ to use an empty implicit Recognizer.

Request body
The request body contains data with the following structure:

JSON representation

{
  "config": {
    object (RecognitionConfig)
  },
  "configMask": string,
  "files": [
    {
      object (BatchRecognizeFileMetadata)
    }
  ],
  "recognitionOutputConfig": {
    object (RecognitionOutputConfig)
  },
  "processingStrategy": enum (ProcessingStrategy)
}
Fields
config	
object (RecognitionConfig)

Features and audio metadata to use for the Automatic Speech Recognition. This field in combination with the configMask field can be used to override parts of the defaultRecognitionConfig of the Recognizer resource.

configMask	
string (FieldMask format)

The list of fields in config that override the values in the defaultRecognitionConfig of the recognizer during this recognition request. If no mask is provided, all given fields in config override the values in the recognizer for this recognition request. If a mask is provided, only the fields listed in the mask override the config in the recognizer for this recognition request. If a wildcard (*) is provided, config completely overrides and replaces the config in the recognizer for this recognition request.

This is a comma-separated list of fully qualified names of fields. Example: "user.displayName,photo".

files[]	
object (BatchRecognizeFileMetadata)

Audio files with file metadata for ASR. The maximum number of files allowed to be specified is 15.

recognitionOutputConfig	
object (RecognitionOutputConfig)

Configuration options for where to output the transcripts of each file.

processingStrategy	
enum (ProcessingStrategy)

Processing strategy to use for this request.

Response body
If successful, the response body contains an instance of Operation.

Authorization scopes
Requires the following OAuth scope:

https://www.googleapis.com/auth/cloud-platform
For more information, see the Authentication Overview.

IAM Permissions
Requires the following IAM permission on the recognizer resource:

speech.recognizers.recognize
For more information, see the IAM documentation.

BatchRecognizeFileMetadata
Metadata about a single file in a batch for recognizers.batchRecognize.

JSON representation

{
  "config": {
    object (RecognitionConfig)
  },
  "configMask": string,

  // Union field audio_source can be only one of the following:
  "uri": string
  // End of list of possible types for union field audio_source.
}
Fields
config	
object (RecognitionConfig)

Features and audio metadata to use for the Automatic Speech Recognition. This field in combination with the configMask field can be used to override parts of the defaultRecognitionConfig of the Recognizer resource as well as the config at the request level.

configMask	
string (FieldMask format)

The list of fields in config that override the values in the defaultRecognitionConfig of the recognizer during this recognition request. If no mask is provided, all non-default valued fields in config override the values in the recognizer for this recognition request. If a mask is provided, only the fields listed in the mask override the config in the recognizer for this recognition request. If a wildcard (*) is provided, config completely overrides and replaces the config in the recognizer for this recognition request.

This is a comma-separated list of fully qualified names of fields. Example: "user.displayName,photo".

Union field audio_source. The audio source, which is a Google Cloud Storage URI. audio_source can be only one of the following:
uri	
string

Cloud Storage URI for the audio file.

RecognitionOutputConfig
Configuration options for the output(s) of recognition.

JSON representation

{
  "outputFormatConfig": {
    object (OutputFormatConfig)
  },

  // Union field output can be only one of the following:
  "gcsOutputConfig": {
    object (GcsOutputConfig)
  },
  "inlineResponseConfig": {
    object (InlineOutputConfig)
  }
  // End of list of possible types for union field output.
}
Fields
outputFormatConfig	
object (OutputFormatConfig)

Optional. Configuration for the format of the results stored to output. If unspecified transcripts will be written in the NATIVE format only.

Union field output.

output can be only one of the following:

gcsOutputConfig	
object (GcsOutputConfig)

If this message is populated, recognition results are written to the provided Google Cloud Storage URI.

inlineResponseConfig	
object (InlineOutputConfig)

If this message is populated, recognition results are provided in the BatchRecognizeResponse message of the Operation when completed. This is only supported when calling recognizers.batchRecognize with just one audio file.

GcsOutputConfig
Output configurations for Cloud Storage.

JSON representation

{
  "uri": string
}
Fields
uri	
string

The Cloud Storage URI prefix with which recognition results will be written.

InlineOutputConfig
This type has no fields.

Output configurations for inline response.

OutputFormatConfig
Configuration for the format of the results stored to output.

JSON representation

{
  "native": {
    object (NativeOutputFileFormatConfig)
  },
  "vtt": {
    object (VttOutputFileFormatConfig)
  },
  "srt": {
    object (SrtOutputFileFormatConfig)
  }
}
Fields
native	
object (NativeOutputFileFormatConfig)

Configuration for the native output format. If this field is set or if no other output format field is set, then transcripts will be written to the sink in the native format.

vtt	
object (VttOutputFileFormatConfig)

Configuration for the VTT output format. If this field is set, then transcripts will be written to the sink in the VTT format.

srt	
object (SrtOutputFileFormatConfig)

Configuration for the SRT output format. If this field is set, then transcripts will be written to the sink in the SRT format.

NativeOutputFileFormatConfig
This type has no fields.

Output configurations for serialized BatchRecognizeResults protos.

VttOutputFileFormatConfig
This type has no fields.

Output configurations for WebVTT formatted subtitle file.

SrtOutputFileFormatConfig
This type has no fields.

Output configurations SubRip Text formatted subtitle file.

ProcessingStrategy
Possible processing strategies for batch requests.

Enums
PROCESSING_STRATEGY_UNSPECIFIED	Default value for the processing strategy. The request is processed as soon as its received.
DYNAMIC_BATCHING	If selected, processes the request during lower utilization periods for a price discount. The request is fulfilled within 24 hours.

————

## Method: projects.locations.recognizers.create

bookmark_border
Creates a Recognizer.

HTTP request
POST https://{endpoint}/v2/{parent=projects/*/locations/*}/recognizers

Where {endpoint} is one of the supported service endpoints.

The URLs use gRPC Transcoding syntax.

Path parameters
Parameters
parent	
string

Required. The project and location where this Recognizer will be created. The expected format is projects/{project}/locations/{location}.

Query parameters
Parameters
validateOnly	
boolean

If set, validate the request and preview the Recognizer, but do not actually create it.

recognizerId	
string

The ID to use for the Recognizer, which will become the final component of the Recognizer's resource name.

This value should be 4-63 characters, and valid characters are /[a-z][0-9]-/.

Request body
The request body contains an instance of Recognizer.

Response body
If successful, the response body contains a newly created instance of Operation.

Authorization scopes
Requires the following OAuth scope:

https://www.googleapis.com/auth/cloud-platform
For more information, see the Authentication Overview.

IAM Permissions
Requires the following IAM permission on the parent resource:

speech.recognizers.create
For more information, see the IAM documentation.

————

## Method: projects.locations.recognizers.get

bookmark_border
返回请求的 Recognizer。如果请求的识别器不存在，则会失败并显示 NOT_FOUND。

HTTP 请求
GET https://{endpoint}/v2/{name=projects/*/locations/*/recognizers/*}

其中 {endpoint} 是受支持的服务端点之一。

网址使用 gRPC 转码语法。

路径参数
参数
name	
string

必需。要检索的识别器的名称。格式应为 projects/{project}/locations/{location}/recognizers/{recognizer}。

请求正文
请求正文必须为空。

响应正文
如果成功，则响应正文包含一个 Recognizer 实例。

授权范围
需要以下 OAuth 范围：

https://www.googleapis.com/auth/cloud-platform
如需了解详情，请参阅身份验证概览。

IAM 权限
需要拥有 name 资源的以下 IAM 权限：

speech.recognizers.get
如需了解详情，请参阅 IAM 文档。

————

## Method: projects.locations.operations.get

bookmark_border
Gets the latest state of a long-running operation. Clients can use this method to poll the operation result at intervals as recommended by the API service.

HTTP request
GET https://{endpoint}/v2/{name=projects/*/locations/*/operations/*}

Where {endpoint} is one of the supported service endpoints.

The URLs use gRPC Transcoding syntax.

Path parameters
Parameters
name	
string

The name of the operation resource.

Request body
The request body must be empty.

Response body
If successful, the response body contains an instance of Operation.

Authorization scopes
Requires the following OAuth scope:

https://www.googleapis.com/auth/cloud-platform
For more information, see the Authentication Overview.

IAM Permissions
Requires the following IAM permission on the name resource:

speech.operations.get
For more information, see the IAM documentation.

————

## Method: projects.locations.config.get

bookmark_border
Returns the requested Config.

HTTP request
GET https://{endpoint}/v2/{name=projects/*/locations/*/config}

Where {endpoint} is one of the supported service endpoints.

The URLs use gRPC Transcoding syntax.

Path parameters
Parameters
name	
string

Required. The name of the config to retrieve. There is exactly one config resource per project per location. The expected format is projects/{project}/locations/{location}/config.

Request body
The request body must be empty.

Response body
If successful, the response body contains an instance of Config.

Authorization scopes
Requires the following OAuth scope:

https://www.googleapis.com/auth/cloud-platform
For more information, see the Authentication Overview.

IAM Permissions
Requires the following IAM permission on the name resource:

speech.config.get
For more information, see the IAM documentation.

————

## Resource: Recognizer
A Recognizer message. Stores recognition configuration and metadata.

JSON representation

{
  "name": string,
  "uid": string,
  "displayName": string,
  "model": string,
  "languageCodes": [
    string
  ],
  "defaultRecognitionConfig": {
    object (RecognitionConfig)
  },
  "annotations": {
    string: string,
    ...
  },
  "state": enum (State),
  "createTime": string,
  "updateTime": string,
  "deleteTime": string,
  "expireTime": string,
  "etag": string,
  "reconciling": boolean,
  "kmsKeyName": string,
  "kmsKeyVersionName": string
}


Fields
name	
string

Output only. Identifier. The resource name of the Recognizer. Format: projects/{project}/locations/{location}/recognizers/{recognizer}.

uid	
string

Output only. System-assigned unique identifier for the Recognizer.

displayName	
string

User-settable, human-readable name for the Recognizer. Must be 63 characters or less.

model
(deprecated)	
string

This item is deprecated!

Optional. This field is now deprecated. Prefer the model field in the RecognitionConfig message.

Which model to use for recognition requests. Select the model best suited to your domain to get best results.

Guidance for choosing which model to use can be found in the Transcription Models Documentation and the models supported in each region can be found in the Table Of Supported Models.

languageCodes[]
(deprecated)	
string

This item is deprecated!

Optional. This field is now deprecated. Prefer the languageCodes field in the RecognitionConfig message.

The language of the supplied audio as a BCP-47 language tag.

Supported languages for each model are listed in the Table of Supported Models.

If additional languages are provided, recognition result will contain recognition in the most likely language detected. The recognition result will include the language tag of the language detected in the audio. When you create or update a Recognizer, these values are stored in normalized BCP-47 form. For example, "en-us" is stored as "en-US".

defaultRecognitionConfig	
object (RecognitionConfig)

Default configuration to use for requests with this Recognizer. This can be overwritten by inline configuration in the RecognizeRequest.config field.

annotations	
map (key: string, value: string)

Allows users to store small amounts of arbitrary data. Both the key and the value must be 63 characters or less each. At most 100 annotations.

An object containing a list of "key": value pairs. Example: { "name": "wrench", "mass": "1.3kg", "count": "3" }.

state	
enum (State)

Output only. The Recognizer lifecycle state.

createTime	
string (Timestamp format)

Output only. Creation time.

A timestamp in RFC3339 UTC "Zulu" format, with nanosecond resolution and up to nine fractional digits. Examples: "2014-10-02T15:01:23Z" and "2014-10-02T15:01:23.045123456Z".

updateTime	
string (Timestamp format)

Output only. The most recent time this Recognizer was modified.

A timestamp in RFC3339 UTC "Zulu" format, with nanosecond resolution and up to nine fractional digits. Examples: "2014-10-02T15:01:23Z" and "2014-10-02T15:01:23.045123456Z".

deleteTime	
string (Timestamp format)

Output only. The time at which this Recognizer was requested for deletion.

A timestamp in RFC3339 UTC "Zulu" format, with nanosecond resolution and up to nine fractional digits. Examples: "2014-10-02T15:01:23Z" and "2014-10-02T15:01:23.045123456Z".

expireTime	
string (Timestamp format)

Output only. The time at which this Recognizer will be purged.

A timestamp in RFC3339 UTC "Zulu" format, with nanosecond resolution and up to nine fractional digits. Examples: "2014-10-02T15:01:23Z" and "2014-10-02T15:01:23.045123456Z".

etag	
string

Output only. This checksum is computed by the server based on the value of other fields. This may be sent on update, undelete, and delete requests to ensure the client has an up-to-date value before proceeding.

reconciling	
boolean

Output only. Whether or not this Recognizer is in the process of being updated.

kmsKeyName	
string

Output only. The KMS key name with which the Recognizer is encrypted. The expected format is projects/{project}/locations/{location}/keyRings/{key_ring}/cryptoKeys/{crypto_key}.

kmsKeyVersionName	
string

Output only. The KMS key version name with which the Recognizer is encrypted. The expected format is projects/{project}/locations/{location}/keyRings/{key_ring}/cryptoKeys/{crypto_key}/cryptoKeyVersions/{crypto_key_version}.

RecognitionConfig
Provides information to the Recognizer that specifies how to process the recognition request.

JSON representation

{
  "model": string,
  "languageCodes": [
    string
  ],
  "features": {
    object (RecognitionFeatures)
  },
  "adaptation": {
    object (SpeechAdaptation)
  },
  "transcriptNormalization": {
    object (TranscriptNormalization)
  },
  "translationConfig": {
    object (TranslationConfig)
  },

  // Union field decoding_config can be only one of the following:
  "autoDecodingConfig": {
    object (AutoDetectDecodingConfig)
  },
  "explicitDecodingConfig": {
    object (ExplicitDecodingConfig)
  }
  // End of list of possible types for union field decoding_config.
}
Fields
model	
string

Optional. Which model to use for recognition requests. Select the model best suited to your domain to get best results.

Guidance for choosing which model to use can be found in the Transcription Models Documentation and the models supported in each region can be found in the Table Of Supported Models.

languageCodes[]	
string

Optional. The language of the supplied audio as a BCP-47 language tag. Language tags are normalized to BCP-47 before they are used eg "en-us" becomes "en-US".

Supported languages for each model are listed in the Table of Supported Models.

If additional languages are provided, recognition result will contain recognition in the most likely language detected. The recognition result will include the language tag of the language detected in the audio.

features	
object (RecognitionFeatures)

Speech recognition features to enable.

adaptation	
object (SpeechAdaptation)

Speech adaptation context that weights recognizer predictions for specific words and phrases.

transcriptNormalization	
object (TranscriptNormalization)

Optional. Use transcription normalization to automatically replace parts of the transcript with phrases of your choosing. For StreamingRecognize, this normalization only applies to stable partial transcripts (stability > 0.8) and final transcripts.

translationConfig	
object (TranslationConfig)

Optional. Optional configuration used to automatically run translation on the given audio to the desired language for supported models.

Union field decoding_config. Decoding parameters for audio being sent for recognition. decoding_config can be only one of the following:
autoDecodingConfig	
object (AutoDetectDecodingConfig)

Automatically detect decoding parameters. Preferred for supported formats.

explicitDecodingConfig	
object (ExplicitDecodingConfig)

Explicitly specified decoding parameters. Required if using headerless PCM audio (linear16, mulaw, alaw).

AutoDetectDecodingConfig
This type has no fields.

Automatically detected decoding parameters. Supported for the following encodings:

WAV_LINEAR16: 16-bit signed little-endian PCM samples in a WAV container.

WAV_MULAW: 8-bit companded mulaw samples in a WAV container.

WAV_ALAW: 8-bit companded alaw samples in a WAV container.

RFC4867_5_AMR: AMR frames with an rfc4867.5 header.

RFC4867_5_AMRWB: AMR-WB frames with an rfc4867.5 header.

FLAC: FLAC frames in the "native FLAC" container format.

MP3: MPEG audio frames with optional (ignored) ID3 metadata.

OGG_OPUS: Opus audio frames in an Ogg container.

WEBM_OPUS: Opus audio frames in a WebM container.

MP4_AAC: AAC audio frames in an MP4 container.

M4A_AAC: AAC audio frames in an M4A container.

MOV_AAC: AAC audio frames in an MOV container.

ExplicitDecodingConfig
Explicitly specified decoding parameters.

JSON representation

{
  "encoding": enum (AudioEncoding),
  "sampleRateHertz": integer,
  "audioChannelCount": integer
}
Fields
encoding	
enum (AudioEncoding)

Required. Encoding of the audio data sent for recognition.

sampleRateHertz	
integer

Optional. Sample rate in Hertz of the audio data sent for recognition. Valid values are: 8000-48000, and 16000 is optimal. For best results, set the sampling rate of the audio source to 16000 Hz. If that's not possible, use the native sample rate of the audio source (instead of resampling). Note that this field is marked as OPTIONAL for backward compatibility reasons. It is (and has always been) effectively REQUIRED.

audioChannelCount	
integer

Optional. Number of channels present in the audio data sent for recognition. Note that this field is marked as OPTIONAL for backward compatibility reasons. It is (and has always been) effectively REQUIRED.

The maximum allowed value is 8.

AudioEncoding
Supported audio data encodings.

Enums
AUDIO_ENCODING_UNSPECIFIED	Default value. This value is unused.
LINEAR16	Headerless 16-bit signed little-endian PCM samples.
MULAW	Headerless 8-bit companded mulaw samples.
ALAW	Headerless 8-bit companded alaw samples.
AMR	AMR frames with an rfc4867.5 header.
AMR_WB	AMR-WB frames with an rfc4867.5 header.
FLAC	FLAC frames in the "native FLAC" container format.
MP3	MPEG audio frames with optional (ignored) ID3 metadata.
OGG_OPUS	Opus audio frames in an Ogg container.
WEBM_OPUS	Opus audio frames in a WebM container.
MP4_AAC	AAC audio frames in an MP4 container.
M4A_AAC	AAC audio frames in an M4A container.
MOV_AAC	AAC audio frames in an MOV container.
RecognitionFeatures
Available recognition features.

JSON representation

{
  "profanityFilter": boolean,
  "enableWordTimeOffsets": boolean,
  "enableWordConfidence": boolean,
  "enableAutomaticPunctuation": boolean,
  "enableSpokenPunctuation": boolean,
  "enableSpokenEmojis": boolean,
  "multiChannelMode": enum (MultiChannelMode),
  "diarizationConfig": {
    object (SpeakerDiarizationConfig)
  },
  "maxAlternatives": integer
}
Fields
profanityFilter	
boolean

If set to true, the server will attempt to filter out profanities, replacing all but the initial character in each filtered word with asterisks, for instance, "f***". If set to false or omitted, profanities won't be filtered out.

enableWordTimeOffsets	
boolean

If true, the top result includes a list of words and the start and end time offsets (timestamps) for those words. If false, no word-level time offset information is returned. The default is false.

enableWordConfidence	
boolean

If true, the top result includes a list of words and the confidence for those words. If false, no word-level confidence information is returned. The default is false.

enableAutomaticPunctuation	
boolean

If true, adds punctuation to recognition result hypotheses. This feature is only available in select languages. The default false value does not add punctuation to result hypotheses.

enableSpokenPunctuation	
boolean

The spoken punctuation behavior for the call. If true, replaces spoken punctuation with the corresponding symbols in the request. For example, "how are you question mark" becomes "how are you?". See https://cloud.google.com/speech-to-text/docs/spoken-punctuation for support. If false, spoken punctuation is not replaced.

enableSpokenEmojis	
boolean

The spoken emoji behavior for the call. If true, adds spoken emoji formatting for the request. This will replace spoken emojis with the corresponding Unicode symbols in the final transcript. If false, spoken emojis are not replaced.

multiChannelMode	
enum (MultiChannelMode)

Mode for recognizing multi-channel audio.

diarizationConfig	
object (SpeakerDiarizationConfig)

Configuration to enable speaker diarization and set additional parameters to make diarization better suited for your application. When this is enabled, we send all the words from the beginning of the audio for the top alternative in every consecutive STREAMING responses. This is done in order to improve our speaker tags as our models learn to identify the speakers in the conversation over time. For non-streaming requests, the diarization results will be provided only in the top alternative of the FINAL SpeechRecognitionResult.

maxAlternatives	
integer

Maximum number of recognition hypotheses to be returned. The server may return fewer than maxAlternatives. Valid values are 0-30. A value of 0 or 1 will return a maximum of one. If omitted, will return a maximum of one.

MultiChannelMode
Options for how to recognize multi-channel audio.

Enums
MULTI_CHANNEL_MODE_UNSPECIFIED	Default value for the multi-channel mode. If the audio contains multiple channels, only the first channel will be transcribed; other channels will be ignored.
SEPARATE_RECOGNITION_PER_CHANNEL	If selected, each channel in the provided audio is transcribed independently. This cannot be selected if the selected model is latest_short.
SpeakerDiarizationConfig
Configuration to enable speaker diarization.

JSON representation

{
  "minSpeakerCount": integer,
  "maxSpeakerCount": integer
}
Fields
minSpeakerCount	
integer

Required. Minimum number of speakers in the conversation. This range gives you more flexibility by allowing the system to automatically determine the correct number of speakers.

To fix the number of speakers detected in the audio, set minSpeakerCount = maxSpeakerCount.

maxSpeakerCount	
integer

Required. Maximum number of speakers in the conversation. Valid values are: 1-6. Must be >= minSpeakerCount. This range gives you more flexibility by allowing the system to automatically determine the correct number of speakers.

SpeechAdaptation
Provides "hints" to the speech recognizer to favor specific words and phrases in the results. PhraseSets can be specified as an inline resource, or a reference to an existing PhraseSet resource.

JSON representation

{
  "phraseSets": [
    {
      object (AdaptationPhraseSet)
    }
  ],
  "customClasses": [
    {
      object (CustomClass)
    }
  ]
}
Fields
phraseSets[]	
object (AdaptationPhraseSet)

A list of inline or referenced PhraseSets.

customClasses[]	
object (CustomClass)

A list of inline CustomClasses. Existing CustomClass resources can be referenced directly in a PhraseSet.

AdaptationPhraseSet
A biasing PhraseSet, which can be either a string referencing the name of an existing PhraseSets resource, or an inline definition of a PhraseSet.

JSON representation

{

  // Union field value can be only one of the following:
  "phraseSet": string,
  "inlinePhraseSet": {
    object (PhraseSet)
  }
  // End of list of possible types for union field value.
}
Fields
Union field value.

value can be only one of the following:

phraseSet	
string

The name of an existing PhraseSet resource. The user must have read access to the resource and it must not be deleted.

inlinePhraseSet	
object (PhraseSet)

An inline defined PhraseSet.

TranscriptNormalization
Transcription normalization configuration. Use transcription normalization to automatically replace parts of the transcript with phrases of your choosing. For StreamingRecognize, this normalization only applies to stable partial transcripts (stability > 0.8) and final transcripts.

JSON representation

{
  "entries": [
    {
      object (Entry)
    }
  ]
}
Fields
entries[]	
object (Entry)

A list of replacement entries. We will perform replacement with one entry at a time. For example, the second entry in ["cat" => "dog", "mountain cat" => "mountain dog"] will never be applied because we will always process the first entry before it. At most 100 entries.

Entry
A single replacement configuration.

JSON representation

{
  "search": string,
  "replace": string,
  "caseSensitive": boolean
}
Fields
search	
string

What to replace. Max length is 100 characters.

replace	
string

What to replace with. Max length is 100 characters.

caseSensitive	
boolean

Whether the search is case sensitive.

TranslationConfig
Translation configuration. Use to translate the given audio into text for the desired language.

JSON representation

{
  "targetLanguage": string
}
Fields
targetLanguage	
string

Required. The language code to translate to.

State
Set of states that define the lifecycle of a Recognizer.

Enums
STATE_UNSPECIFIED	The default value. This value is used if the state is omitted.
ACTIVE	The Recognizer is active and ready for use.
DELETED	This Recognizer has been deleted.
Methods
batchRecognize
Performs batch asynchronous speech recognition: send a request with N audio files and receive a long running operation that can be polled to see when the transcriptions are finished.
create
Creates a Recognizer.
delete
Deletes the Recognizer.
get
Returns the requested Recognizer.
list
Lists Recognizers.
patch
Updates the Recognizer.
recognize
Performs synchronous Speech recognition: receive results after all audio has been sent and processed.
undelete
Undeletes the Recognizer.

————

## Resource: Operation
This resource represents a long-running operation that is the result of a network API call.

JSON representation

{
  "name": string,
  "metadata": {
    "@type": string,
    field1: ...,
    ...
  },
  "done": boolean,

  // Union field result can be only one of the following:
  "error": {
    object (Status)
  },
  "response": {
    "@type": string,
    field1: ...,
    ...
  }
  // End of list of possible types for union field result.
}
Fields
name	
string

The server-assigned name, which is only unique within the same service that originally returns it. If you use the default HTTP mapping, the name should be a resource name ending with operations/{unique_id}.

metadata	
object

Service-specific metadata associated with the operation. It typically contains progress information and common metadata such as create time. Some services might not provide such metadata. Any method that returns a long-running operation should document the metadata type, if any.

An object containing fields of an arbitrary type. An additional field "@type" contains a URI identifying the type. Example: { "id": 1234, "@type": "types.example.com/standard/id" }.

done	
boolean

If the value is false, it means the operation is still in progress. If true, the operation is completed, and either error or response is available.

Union field result. The operation result, which can be either an error or a valid response. If done == false, neither error nor response is set. If done == true, exactly one of error or response can be set. Some services might not provide the result. result can be only one of the following:
error	
object (Status)

The error result of the operation in case of failure or cancellation.

response	
object

The normal, successful response of the operation. If the original method returns no data on success, such as Delete, the response is google.protobuf.Empty. If the original method is standard Get/Create/Update, the response should be the resource. For other methods, the response should have the type XxxResponse, where Xxx is the original method name. For example, if the original method name is TakeSnapshot(), the inferred response type is TakeSnapshotResponse.

An object containing fields of an arbitrary type. An additional field "@type" contains a URI identifying the type. Example: { "id": 1234, "@type": "types.example.com/standard/id" }.

Status
The Status type defines a logical error model that is suitable for different programming environments, including REST APIs and RPC APIs. It is used by gRPC. Each Status message contains three pieces of data: error code, error message, and error details.

You can find out more about this error model and how to work with it in the API Design Guide.

JSON representation

{
  "code": integer,
  "message": string,
  "details": [
    {
      "@type": string,
      field1: ...,
      ...
    }
  ]
}
Fields
code	
integer

The status code, which should be an enum value of google.rpc.Code.

message	
string

A developer-facing error message, which should be in English. Any user-facing error message should be localized and sent in the google.rpc.Status.details field, or localized by the client.

details[]	
object

A list of messages that carry the error details. There is a common set of message types for APIs to use.

An object containing fields of an arbitrary type. An additional field "@type" contains a URI identifying the type. Example: { "id": 1234, "@type": "types.example.com/standard/id" }.

Methods
cancel
Starts asynchronous cancellation on a long-running operation.
delete
Deletes a long-running operation.
get
Gets the latest state of a long-running operation.
list
Lists operations that match the specified filter in the request.

————



# ————以下是V1————
## Method: speech.longrunningrecognize

bookmark_border
Performs asynchronous speech recognition: receive results via the google.longrunning.Operations interface. Returns either an Operation.error or an Operation.response which contains a LongRunningRecognizeResponse message. For more information on asynchronous speech recognition, see the how-to.

HTTP request
POST https://speech.googleapis.com/v1/speech:longrunningrecognize

The URL uses gRPC Transcoding syntax.

Request body
The request body contains data with the following structure:

JSON representation

{
  "config": {
    object (RecognitionConfig)
  },
  "audio": {
    object (RecognitionAudio)
  },
  "outputConfig": {
    object (TranscriptOutputConfig)
  }
}
Fields
config	
object (RecognitionConfig)

Required. Provides information to the recognizer that specifies how to process the request.

audio	
object (RecognitionAudio)

Required. The audio data to be recognized.

outputConfig	
object (TranscriptOutputConfig)

Optional. Specifies an optional destination for the recognition results.

Response body
If successful, the response body contains an instance of Operation.

Authorization Scopes
Requires the following OAuth scope:

https://www.googleapis.com/auth/cloud-platform
For more information, see the Authentication Overview.

TranscriptOutputConfig
Specifies an optional destination for the recognition results.

JSON representation

{

  // Union field output_type can be only one of the following:
  "gcsUri": string
  // End of list of possible types for union field output_type.
}
Fields
Union field output_type.

output_type can be only one of the following:

gcsUri	
string

Specifies a Cloud Storage URI for the recognition results. Must be specified in the format: gs://bucket_name/object_name, and the bucket must already exist.

————

Method: speech.recognize

bookmark_border
Performs synchronous speech recognition: receive results after all audio has been sent and processed.

HTTP request
POST https://speech.googleapis.com/v1/speech:recognize

The URL uses gRPC Transcoding syntax.

Request body
The request body contains data with the following structure:

JSON representation

{
  "config": {
    object (RecognitionConfig)
  },
  "audio": {
    object (RecognitionAudio)
  }
}
Fields
config	
object (RecognitionConfig)

Required. Provides information to the recognizer that specifies how to process the request.

audio	
object (RecognitionAudio)

Required. The audio data to be recognized.

Response body
If successful, the response body contains data with the following structure:

The only message returned to the client by the speech.recognize method. It contains the result as zero or more sequential SpeechRecognitionResult messages.

JSON representation

{
  "results": [
    {
      object (SpeechRecognitionResult)
    }
  ],
  "totalBilledTime": string,
  "speechAdaptationInfo": {
    object (SpeechAdaptationInfo)
  },
  "requestId": string
}
Fields
results[]	
object (SpeechRecognitionResult)

Sequential list of transcription results corresponding to sequential portions of audio.

totalBilledTime	
string (Duration format)

When available, billed audio seconds for the corresponding request.

A duration in seconds with up to nine fractional digits, ending with 's'. Example: "3.5s".

speechAdaptationInfo	
object (SpeechAdaptationInfo)

Provides information on adaptation behavior in response

requestId	
string (int64 format)

The ID associated with the request. This is a unique ID specific only to the given request.

Authorization Scopes
Requires the following OAuth scope:

https://www.googleapis.com/auth/cloud-platform
For more information, see the Authentication Overview.

SpeechRecognitionResult
A speech recognition result corresponding to a portion of the audio.

JSON representation

{
  "alternatives": [
    {
      object (SpeechRecognitionAlternative)
    }
  ],
  "channelTag": integer,
  "resultEndTime": string,
  "languageCode": string
}
Fields
alternatives[]	
object (SpeechRecognitionAlternative)

May contain one or more recognition hypotheses (up to the maximum specified in maxAlternatives). These alternatives are ordered in terms of accuracy, with the top (first) alternative being the most probable, as ranked by the recognizer.

channelTag	
integer

For multi-channel audio, this is the channel number corresponding to the recognized result for the audio from that channel. For audioChannelCount = N, its output values can range from '1' to 'N'.

resultEndTime	
string (Duration format)

Time offset of the end of this result relative to the beginning of the audio.

A duration in seconds with up to nine fractional digits, ending with 's'. Example: "3.5s".

languageCode	
string

Output only. The BCP-47 language tag of the language in this result. This language code was detected to have the most likelihood of being spoken in the audio.

SpeechRecognitionAlternative
Alternative hypotheses (a.k.a. n-best list).

JSON representation

{
  "transcript": string,
  "confidence": number,
  "words": [
    {
      object (WordInfo)
    }
  ]
}
Fields
transcript	
string

Transcript text representing the words that the user spoke. In languages that use spaces to separate words, the transcript might have a leading space if it isn't the first result. You can concatenate each result to obtain the full transcript without using a separator.

confidence	
number

The confidence estimate between 0.0 and 1.0. A higher number indicates an estimated greater likelihood that the recognized words are correct. This field is set only for the top alternative of a non-streaming result or, of a streaming result where isFinal=true. This field is not guaranteed to be accurate and users should not rely on it to be always provided. The default of 0.0 is a sentinel value indicating confidence was not set.

words[]	
object (WordInfo)

A list of word-specific information for each recognized word. Note: When enableSpeakerDiarization is true, you will see all the words from the beginning of the audio.

WordInfo
Word-specific information for recognized words.

JSON representation

{
  "startTime": string,
  "endTime": string,
  "word": string,
  "confidence": number,
  "speakerTag": integer
}
Fields
startTime	
string (Duration format)

Time offset relative to the beginning of the audio, and corresponding to the start of the spoken word. This field is only set if enableWordTimeOffsets=true and only in the top hypothesis. This is an experimental feature and the accuracy of the time offset can vary.

A duration in seconds with up to nine fractional digits, ending with 's'. Example: "3.5s".

endTime	
string (Duration format)

Time offset relative to the beginning of the audio, and corresponding to the end of the spoken word. This field is only set if enableWordTimeOffsets=true and only in the top hypothesis. This is an experimental feature and the accuracy of the time offset can vary.

A duration in seconds with up to nine fractional digits, ending with 's'. Example: "3.5s".

word	
string

The word corresponding to this set of information.

confidence	
number

The confidence estimate between 0.0 and 1.0. A higher number indicates an estimated greater likelihood that the recognized words are correct. This field is set only for the top alternative of a non-streaming result or, of a streaming result where isFinal=true. This field is not guaranteed to be accurate and users should not rely on it to be always provided. The default of 0.0 is a sentinel value indicating confidence was not set.

speakerTag	
integer

Output only. A distinct integer value is assigned for every speaker within the audio. This field specifies which one of those speakers was detected to have spoken this word. Value ranges from '1' to diarizationSpeakerCount. speakerTag is set if enableSpeakerDiarization = 'true' and only in the top alternative.

SpeechAdaptationInfo
Information on speech adaptation use in results

JSON representation

{
  "adaptationTimeout": boolean,
  "timeoutMessage": string
}
Fields
adaptationTimeout	
boolean

Whether there was a timeout when applying speech adaptation. If true, adaptation had no effect in the response transcript.

timeoutMessage	
string

If set, returns a message specifying which part of the speech adaptation request timed out.

————

RecognitionAudio

bookmark_border
Contains audio data in the encoding specified in the RecognitionConfig. Either content or uri must be supplied. Supplying both or neither returns google.rpc.Code.INVALID_ARGUMENT. See content limits.

JSON representation

{

  // Union field audio_source can be only one of the following:
  "content": string,
  "uri": string
  // End of list of possible types for union field audio_source.
}
Fields
Union field audio_source. The audio source, which is either inline content or a Google Cloud Storage uri. audio_source can be only one of the following:
content	
string (bytes format)

The audio data bytes encoded as specified in RecognitionConfig. Note: as with all bytes fields, proto buffers use a pure binary representation, whereas JSON representations use base64.

A base64-encoded string.

uri	
string

URI that points to a file that contains audio data bytes as specified in RecognitionConfig. The file must not be compressed (for example, gzip). Currently, only Google Cloud Storage URIs are supported, which must be specified in the following format: gs://bucket_name/object_name (other URI formats return google.rpc.Code.INVALID_ARGUMENT). For more information, see Request URIs.

————

RecognitionConfig

bookmark_border
Provides information to the recognizer that specifies how to process the request.

JSON representation

{
  "encoding": enum (AudioEncoding),
  "sampleRateHertz": integer,
  "audioChannelCount": integer,
  "enableSeparateRecognitionPerChannel": boolean,
  "languageCode": string,
  "alternativeLanguageCodes": [
    string
  ],
  "maxAlternatives": integer,
  "profanityFilter": boolean,
  "adaptation": {
    object (SpeechAdaptation)
  },
  "speechContexts": [
    {
      object (SpeechContext)
    }
  ],
  "enableWordTimeOffsets": boolean,
  "enableWordConfidence": boolean,
  "enableAutomaticPunctuation": boolean,
  "enableSpokenPunctuation": boolean,
  "enableSpokenEmojis": boolean,
  "diarizationConfig": {
    object (SpeakerDiarizationConfig)
  },
  "metadata": {
    object (RecognitionMetadata)
  },
  "model": string,
  "useEnhanced": boolean
}
Fields
encoding	
enum (AudioEncoding)

Encoding of audio data sent in all RecognitionAudio messages. This field is optional for FLAC and WAV audio files and required for all other audio formats. For details, see AudioEncoding.

sampleRateHertz	
integer

Sample rate in Hertz of the audio data sent in all RecognitionAudio messages. Valid values are: 8000-48000. 16000 is optimal. For best results, set the sampling rate of the audio source to 16000 Hz. If that's not possible, use the native sample rate of the audio source (instead of re-sampling). This field is optional for FLAC and WAV audio files, but is required for all other audio formats. For details, see AudioEncoding.

audioChannelCount	
integer

The number of channels in the input audio data. ONLY set this for MULTI-CHANNEL recognition. Valid values for LINEAR16, OGG_OPUS and FLAC are 1-8. Valid value for MULAW, AMR, AMR_WB and SPEEX_WITH_HEADER_BYTE is only 1. If 0 or omitted, defaults to one channel (mono). Note: We only recognize the first channel by default. To perform independent recognition on each channel set enableSeparateRecognitionPerChannel to 'true'.

enableSeparateRecognitionPerChannel	
boolean

This needs to be set to true explicitly and audioChannelCount > 1 to get each channel recognized separately. The recognition result will contain a channelTag field to state which channel that result belongs to. If this is not true, we will only recognize the first channel. The request is billed cumulatively for all channels recognized: audioChannelCount multiplied by the length of the audio.

languageCode	
string

Required. The language of the supplied audio as a BCP-47 language tag. Example: "en-US". See Language Support for a list of the currently supported language codes.

alternativeLanguageCodes[]	
string

A list of up to 3 additional BCP-47 language tags, listing possible alternative languages of the supplied audio. See Language Support for a list of the currently supported language codes. If alternative languages are listed, recognition result will contain recognition in the most likely language detected including the main languageCode. The recognition result will include the language tag of the language detected in the audio. Note: This feature is only supported for Voice Command and Voice Search use cases and performance may vary for other use cases (e.g., phone call transcription).

maxAlternatives	
integer

Maximum number of recognition hypotheses to be returned. Specifically, the maximum number of SpeechRecognitionAlternative messages within each SpeechRecognitionResult. The server may return fewer than maxAlternatives. Valid values are 0-30. A value of 0 or 1 will return a maximum of one. If omitted, will return a maximum of one.

profanityFilter	
boolean

If set to true, the server will attempt to filter out profanities, replacing all but the initial character in each filtered word with asterisks, e.g. "f***". If set to false or omitted, profanities won't be filtered out.

adaptation	
object (SpeechAdaptation)

Speech adaptation configuration improves the accuracy of speech recognition. For more information, see the speech adaptation documentation. When speech adaptation is set it supersedes the speechContexts field.

speechContexts[]	
object (SpeechContext)

Array of SpeechContext. A means to provide context to assist the speech recognition. For more information, see speech adaptation.

enableWordTimeOffsets	
boolean

If true, the top result includes a list of words and the start and end time offsets (timestamps) for those words. If false, no word-level time offset information is returned. The default is false.

enableWordConfidence	
boolean

If true, the top result includes a list of words and the confidence for those words. If false, no word-level confidence information is returned. The default is false.

enableAutomaticPunctuation	
boolean

If 'true', adds punctuation to recognition result hypotheses. This feature is only available in select languages. Setting this for requests in other languages has no effect at all. The default 'false' value does not add punctuation to result hypotheses.

enableSpokenPunctuation	
boolean

The spoken punctuation behavior for the call If not set, uses default behavior based on model of choice e.g. command_and_search will enable spoken punctuation by default If 'true', replaces spoken punctuation with the corresponding symbols in the request. For example, "how are you question mark" becomes "how are you?". See https://cloud.google.com/speech-to-text/docs/spoken-punctuation for support. If 'false', spoken punctuation is not replaced.

enableSpokenEmojis	
boolean

The spoken emoji behavior for the call If not set, uses default behavior based on model of choice If 'true', adds spoken emoji formatting for the request. This will replace spoken emojis with the corresponding Unicode symbols in the final transcript. If 'false', spoken emojis are not replaced.

diarizationConfig	
object (SpeakerDiarizationConfig)

Config to enable speaker diarization and set additional parameters to make diarization better suited for your application. Note: When this is enabled, we send all the words from the beginning of the audio for the top alternative in every consecutive STREAMING responses. This is done in order to improve our speaker tags as our models learn to identify the speakers in the conversation over time. For non-streaming requests, the diarization results will be provided only in the top alternative of the FINAL SpeechRecognitionResult.

metadata	
object (RecognitionMetadata)

Metadata regarding this request.

model	
string

Which model to select for the given request. Select the model best suited to your domain to get best results. If a model is not explicitly specified, then we auto-select a model based on the parameters in the RecognitionConfig.

Model	Description
latest_long

Best for long form content like media or conversation.
latest_short

Best for short form content like commands or single shot directed speech.
command_and_search

Best for short queries such as voice commands or voice search.
phone_call

Best for audio that originated from a phone call (typically recorded at an 8khz sampling rate).
video

Best for audio that originated from video or includes multiple speakers. Ideally the audio is recorded at a 16khz or greater sampling rate. This is a premium model that costs more than the standard rate.
default

Best for audio that is not one of the specific audio models. For example, long-form audio. Ideally the audio is high-fidelity, recorded at a 16khz or greater sampling rate.
medical_conversation

Best for audio that originated from a conversation between a medical provider and patient.
medical_dictation

Best for audio that originated from dictation notes by a medical provider.
useEnhanced	
boolean

Set to true to use an enhanced model for speech recognition. If useEnhanced is set to true and the model field is not set, then an appropriate enhanced model is chosen if an enhanced model exists for the audio.

If useEnhanced is true and an enhanced version of the specified model does not exist, then the speech is recognized using the standard version of the specified model.

AudioEncoding
The encoding of the audio data sent in the request.

All encodings support only 1 channel (mono) audio, unless the audioChannelCount and enableSeparateRecognitionPerChannel fields are set.

For best results, the audio source should be captured and transmitted using a lossless encoding (FLAC or LINEAR16). The accuracy of the speech recognition can be reduced if lossy codecs are used to capture or transmit audio, particularly if background noise is present. Lossy codecs include MULAW, AMR, AMR_WB, OGG_OPUS, SPEEX_WITH_HEADER_BYTE, MP3, and WEBM_OPUS.

The FLAC and WAV audio file formats include a header that describes the included audio content. You can request recognition for WAV files that contain either LINEAR16 or MULAW encoded audio. If you send FLAC or WAV audio file format in your request, you do not need to specify an AudioEncoding; the audio encoding format is determined from the file header. If you specify an AudioEncoding when you send send FLAC or WAV audio, the encoding configuration must match the encoding described in the audio header; otherwise the request returns an google.rpc.Code.INVALID_ARGUMENT error code.

Enums
ENCODING_UNSPECIFIED	Not specified.
LINEAR16	Uncompressed 16-bit signed little-endian samples (Linear PCM).
FLAC	FLAC (Free Lossless Audio Codec) is the recommended encoding because it is lossless--therefore recognition is not compromised--and requires only about half the bandwidth of LINEAR16. FLAC stream encoding supports 16-bit and 24-bit samples, however, not all fields in STREAMINFO are supported.
MULAW	8-bit samples that compand 14-bit audio samples using G.711 PCMU/mu-law.
AMR	Adaptive Multi-Rate Narrowband codec. sampleRateHertz must be 8000.
AMR_WB	Adaptive Multi-Rate Wideband codec. sampleRateHertz must be 16000.
OGG_OPUS	Opus encoded audio frames in Ogg container (OggOpus). sampleRateHertz must be one of 8000, 12000, 16000, 24000, or 48000.
SPEEX_WITH_HEADER_BYTE	Although the use of lossy encodings is not recommended, if a very low bitrate encoding is required, OGG_OPUS is highly preferred over Speex encoding. The Speex encoding supported by Cloud Speech API has a header byte in each block, as in MIME type audio/x-speex-with-header-byte. It is a variant of the RTP Speex encoding defined in RFC 5574. The stream is a sequence of blocks, one block per RTP packet. Each block starts with a byte containing the length of the block, in bytes, followed by one or more frames of Speex data, padded to an integral number of bytes (octets) as specified in RFC 5574. In other words, each RTP header is replaced with a single byte containing the block length. Only Speex wideband is supported. sampleRateHertz must be 16000.
WEBM_OPUS	Opus encoded audio frames in WebM container (OggOpus). sampleRateHertz must be one of 8000, 12000, 16000, 24000, or 48000.
SpeechAdaptation
Speech adaptation configuration.

JSON representation

{
  "phraseSets": [
    {
      object (PhraseSet)
    }
  ],
  "phraseSetReferences": [
    string
  ],
  "customClasses": [
    {
      object (CustomClass)
    }
  ],
  "abnfGrammar": {
    object (ABNFGrammar)
  }
}
Fields
phraseSets[]	
object (PhraseSet)

A collection of phrase sets. To specify the hints inline, leave the phrase set's name blank and fill in the rest of its fields. Any phrase set can use any custom class.

phraseSetReferences[]	
string

A collection of phrase set resource names to use.

customClasses[]	
object (CustomClass)

A collection of custom classes. To specify the classes inline, leave the class' name blank and fill in the rest of its fields, giving it a unique customClassId. Refer to the inline defined class in phrase hints by its customClassId.

abnfGrammar	
object (ABNFGrammar)

Augmented Backus-Naur form (ABNF) is a standardized grammar notation comprised by a set of derivation rules. See specifications: https://www.w3.org/TR/speech-grammar

ABNFGrammar
JSON representation

{
  "abnfStrings": [
    string
  ]
}
Fields
abnfStrings[]	
string

All declarations and rules of an ABNF grammar broken up into multiple strings that will end up concatenated.

SpeechContext
Provides "hints" to the speech recognizer to favor specific words and phrases in the results.

JSON representation

{
  "phrases": [
    string
  ],
  "boost": number
}
Fields
phrases[]	
string

A list of strings containing words and phrases "hints" so that the speech recognition is more likely to recognize them. This can be used to improve the accuracy for specific words and phrases, for example, if specific commands are typically spoken by the user. This can also be used to add additional words to the vocabulary of the recognizer. See usage limits.

List items can also be set to classes for groups of words that represent common concepts that occur in natural language. For example, rather than providing phrase hints for every month of the year, using the $MONTH class improves the likelihood of correctly transcribing audio that includes months.

boost	
number

Hint Boost. Positive value will increase the probability that a specific phrase will be recognized over other similar sounding phrases. The higher the boost, the higher the chance of false positive recognition as well. Negative boost values would correspond to anti-biasing. Anti-biasing is not enabled, so negative boost will simply be ignored. Though boost can accept a wide range of positive values, most use cases are best served with values between 0 and 20. We recommend using a binary search approach to finding the optimal value for your use case.

SpeakerDiarizationConfig
Config to enable speaker diarization.

JSON representation

{
  "enableSpeakerDiarization": boolean,
  "minSpeakerCount": integer,
  "maxSpeakerCount": integer,
  "speakerTag": integer
}
Fields
enableSpeakerDiarization	
boolean

If 'true', enables speaker detection for each recognized word in the top alternative of the recognition result using a speakerTag provided in the WordInfo.

minSpeakerCount	
integer

Minimum number of speakers in the conversation. This range gives you more flexibility by allowing the system to automatically determine the correct number of speakers. If not set, the default value is 2.

maxSpeakerCount	
integer

Maximum number of speakers in the conversation. This range gives you more flexibility by allowing the system to automatically determine the correct number of speakers. If not set, the default value is 6.

speakerTag
(deprecated)	
integer

This item is deprecated!

Output only. Unused.

RecognitionMetadata
This item is deprecated!

Description of audio data to be recognized.

JSON representation

{
  "interactionType": enum (InteractionType),
  "industryNaicsCodeOfAudio": integer,
  "microphoneDistance": enum (MicrophoneDistance),
  "originalMediaType": enum (OriginalMediaType),
  "recordingDeviceType": enum (RecordingDeviceType),
  "recordingDeviceName": string,
  "originalMimeType": string,
  "audioTopic": string
}
Fields
interactionType	
enum (InteractionType)

The use case most closely describing the audio content to be recognized.

industryNaicsCodeOfAudio	
integer (uint32 format)

The industry vertical to which this speech recognition request most closely applies. This is most indicative of the topics contained in the audio. Use the 6-digit NAICS code to identify the industry vertical - see https://www.naics.com/search/.

microphoneDistance	
enum (MicrophoneDistance)

The audio type that most closely describes the audio being recognized.

originalMediaType	
enum (OriginalMediaType)

The original media the speech was recorded on.

recordingDeviceType	
enum (RecordingDeviceType)

The type of device the speech was recorded with.

recordingDeviceName	
string

The device used to make the recording. Examples 'Nexus 5X' or 'Polycom SoundStation IP 6000' or 'POTS' or 'VoIP' or 'Cardioid Microphone'.

originalMimeType	
string

Mime type of the original audio file. For example audio/m4a, audio/x-alaw-basic, audio/mp3, audio/3gpp. A list of possible audio mime types is maintained at http://www.iana.org/assignments/media-types/media-types.xhtml#audio

audioTopic	
string

Description of the content. Eg. "Recordings of federal supreme court hearings from 2012".

InteractionType
Use case categories that the audio recognition request can be described by.

Enums
INTERACTION_TYPE_UNSPECIFIED	Use case is either unknown or is something other than one of the other values below.
DISCUSSION	Multiple people in a conversation or discussion. For example in a meeting with two or more people actively participating. Typically all the primary people speaking would be in the same room (if not, see PHONE_CALL)
PRESENTATION	One or more persons lecturing or presenting to others, mostly uninterrupted.
PHONE_CALL	A phone-call or video-conference in which two or more people, who are not in the same room, are actively participating.
VOICEMAIL	A recorded message intended for another person to listen to.
PROFESSIONALLY_PRODUCED	Professionally produced audio (eg. TV Show, Podcast).
VOICE_SEARCH	Transcribe spoken questions and queries into text.
VOICE_COMMAND	Transcribe voice commands, such as for controlling a device.
DICTATION	Transcribe speech to text to create a written document, such as a text-message, email or report.
MicrophoneDistance
Enumerates the types of capture settings describing an audio file.

Enums
MICROPHONE_DISTANCE_UNSPECIFIED	Audio type is not known.
NEARFIELD	The audio was captured from a closely placed microphone. Eg. phone, dictaphone, or handheld microphone. Generally if there speaker is within 1 meter of the microphone.
MIDFIELD	The speaker if within 3 meters of the microphone.
FARFIELD	The speaker is more than 3 meters away from the microphone.
OriginalMediaType
The original media the speech was recorded on.

Enums
ORIGINAL_MEDIA_TYPE_UNSPECIFIED	Unknown original media type.
AUDIO	The speech data is an audio recording.
VIDEO	The speech data originally recorded on a video.
RecordingDeviceType
The type of device the speech was recorded with.

Enums
RECORDING_DEVICE_TYPE_UNSPECIFIED	The recording device is unknown.
SMARTPHONE	Speech was recorded on a smartphone.
PC	Speech was recorded using a personal computer or tablet.
PHONE_LINE	Speech was recorded over a phone line.
VEHICLE	Speech was recorded in a vehicle.
OTHER_OUTDOOR_DEVICE	Speech was recorded outdoors.
OTHER_INDOOR_DEVICE	Speech was recorded indoors.
