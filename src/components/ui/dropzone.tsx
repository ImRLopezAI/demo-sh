import type * as React from 'react'
import {
	createContext,
	forwardRef,
	useCallback,
	useContext,
	useId,
	useMemo,
	useReducer,
	useState,
} from 'react'
import {
	type Accept,
	type FileRejection,
	useDropzone as rootUseDropzone,
} from 'react-dropzone'

import { cn } from '@/lib/utils'
import { Button } from './button'

type ButtonProps = React.ComponentPropsWithoutRef<typeof Button>

type DropzoneResult<TUploadRes, TUploadError> =
	| {
			status: 'pending'
	  }
	| {
			status: 'error'
			error: TUploadError
	  }
	| {
			status: 'success'
			result: TUploadRes
	  }

type FileError<TUploadError> = TUploadError | string

export type FileStatus<TUploadRes, TUploadError> = {
	id: string
	fileName: string
	file: File
	tries: number
} & (
	| {
			status: 'pending'
			result?: undefined
			error?: undefined
	  }
	| {
			status: 'error'
			error: FileError<TUploadError>
			result?: undefined
	  }
	| {
			status: 'success'
			result: TUploadRes
			error?: undefined
	  }
)

const fileStatusReducer = <TUploadRes, TUploadError>(
	state: FileStatus<TUploadRes, TUploadError>[],
	action:
		| {
				type: 'add'
				id: string
				fileName: string
				file: File
		  }
		| {
				type: 'remove'
				id: string
		  }
		| ({
				type: 'update-status'
				id: string
		  } & DropzoneResult<TUploadRes, FileError<TUploadError>>),
): FileStatus<TUploadRes, TUploadError>[] => {
	switch (action.type) {
		case 'add':
			return [
				...state,
				{
					id: action.id,
					fileName: action.fileName,
					file: action.file,
					status: 'pending',
					tries: 1,
				},
			]
		case 'remove':
			return state.filter((fileStatus) => fileStatus.id !== action.id)
		case 'update-status':
			return state.map((fileStatus) => {
				if (fileStatus.id === action.id) {
					const { id, type, ...rest } = action
					return {
						...fileStatus,
						...rest,
						tries:
							action.status === 'pending'
								? fileStatus.tries + 1
								: fileStatus.tries,
					} as FileStatus<TUploadRes, TUploadError>
				}
				return fileStatus
			})
		default:
			return state
	}
}

const dropZoneErrorCodes = [
	'file-invalid-type',
	'file-too-large',
	'file-too-small',
	'too-many-files',
] as const

type DropZoneErrorCode = (typeof dropZoneErrorCodes)[number]

const getDropZoneErrorCodes = (fileRejections: FileRejection[]) => {
	const errors = fileRejections.map((rejection) => {
		return rejection.errors
			.filter((error) =>
				dropZoneErrorCodes.includes(error.code as DropZoneErrorCode),
			)
			.map((error) => error.code) as DropZoneErrorCode[]
	})
	return Array.from(new Set(errors.flat()))
}

const getRootError = (
	errorCodes: DropZoneErrorCode[],
	limits: {
		accept?: Accept
		maxSize?: number
		minSize?: number
		maxFiles?: number
	},
): string | undefined => {
	const errors = errorCodes
		.map((error) => {
			switch (error) {
				case 'file-invalid-type': {
					const acceptedTypes = Object.values(limits.accept ?? {})
						.flat()
						.join(', ')
					return acceptedTypes.length > 0
						? `only ${acceptedTypes} are allowed`
						: 'file type is not allowed'
				}
				case 'file-too-large': {
					const maxMb = limits.maxSize
						? (limits.maxSize / (1024 * 1024)).toFixed(2)
						: 'infinite?'
					return `max size is ${maxMb}MB`
				}
				case 'file-too-small': {
					const roundedMinSize = limits.minSize
						? (limits.minSize / (1024 * 1024)).toFixed(2)
						: 'negative?'
					return `min size is ${roundedMinSize}MB`
				}
				case 'too-many-files':
					return `max ${limits.maxFiles} files`
			}
		})
		.filter((error): error is string => Boolean(error))

	if (errors.length === 0) {
		return undefined
	}

	const joinedErrors = errors.join(', ')
	return joinedErrors.charAt(0).toUpperCase() + joinedErrors.slice(1)
}

type UseDropzoneProps<TUploadRes, TUploadError> = {
	onDropFile: (
		file: File,
	) => Promise<
		Exclude<DropzoneResult<TUploadRes, TUploadError>, { status: 'pending' }>
	>
	onRemoveFile?: (id: string) => void | Promise<void>
	onFileUploaded?: (result: TUploadRes) => void
	onFileUploadError?: (error: TUploadError) => void
	onAllUploaded?: () => void
	onRootError?: (error: string | undefined) => void
	maxRetryCount?: number
	autoRetry?: boolean
	validation?: {
		accept?: Accept
		minSize?: number
		maxSize?: number
		maxFiles?: number
	}
	shiftOnMaxFiles?: boolean
} & (TUploadError extends string
	? {
			shapeUploadError?: (error: TUploadError) => string | undefined
		}
	: {
			shapeUploadError: (error: TUploadError) => string | undefined
		})

interface UseDropzoneReturn<TUploadRes, TUploadError> {
	getRootProps: ReturnType<typeof rootUseDropzone>['getRootProps']
	getInputProps: ReturnType<typeof rootUseDropzone>['getInputProps']
	onRemoveFile: (id: string) => Promise<void>
	onRetry: (id: string) => Promise<void>
	canRetry: (id: string) => boolean
	fileStatuses: FileStatus<TUploadRes, TUploadError>[]
	isInvalid: boolean
	isDragActive: boolean
	rootError: string | undefined
	inputId: string
	rootMessageId: string
	rootDescriptionId: string
	getFileMessageId: (id: string) => string
}

const useDropzone = <TUploadRes, TUploadError = string>(
	props: UseDropzoneProps<TUploadRes, TUploadError>,
): UseDropzoneReturn<TUploadRes, TUploadError> => {
	const {
		onDropFile: pOnDropFile,
		onRemoveFile: pOnRemoveFile,
		shapeUploadError: pShapeUploadError,
		onFileUploaded: pOnFileUploaded,
		onFileUploadError: pOnFileUploadError,
		onAllUploaded: pOnAllUploaded,
		onRootError: pOnRootError,
		maxRetryCount,
		autoRetry,
		validation,
		shiftOnMaxFiles,
	} = props

	const inputId = useId()
	const rootMessageId = `${inputId}-root-message`
	const rootDescriptionId = `${inputId}-description`
	const [rootError, _setRootError] = useState<string | undefined>(undefined)

	const setRootError = useCallback(
		(error: string | undefined) => {
			_setRootError(error)
			if (pOnRootError !== undefined) {
				pOnRootError(error)
			}
		},
		[pOnRootError],
	)

	const [fileStatuses, dispatch] = useReducer(
		fileStatusReducer<TUploadRes, TUploadError>,
		[] as FileStatus<TUploadRes, TUploadError>[],
	)

	const isInvalid = useMemo(() => {
		return (
			fileStatuses.filter((file) => file.status === 'error').length > 0 ||
			rootError !== undefined
		)
	}, [fileStatuses, rootError])

	const _uploadFile = useCallback(
		async (file: File, id: string, tries = 0) => {
			const result = await pOnDropFile(file)

			if (result.status === 'error') {
				if (autoRetry === true && tries < (maxRetryCount ?? Infinity)) {
					dispatch({ type: 'update-status', id, status: 'pending' })
					return _uploadFile(file, id, tries + 1)
				}

				const shapedError =
					pShapeUploadError !== undefined
						? pShapeUploadError(result.error)
						: undefined
				const errorMessage =
					shapedError !== undefined ? shapedError : String(result.error)

				dispatch({
					type: 'update-status',
					id,
					status: 'error',
					error: errorMessage,
				})
				if (pOnFileUploadError !== undefined) {
					pOnFileUploadError(result.error)
				}
				return
			}
			if (pOnFileUploaded !== undefined) {
				pOnFileUploaded(result.result)
			}
			dispatch({
				type: 'update-status',
				id,
				status: 'success',
				result: result.result,
			})
		},
		[
			autoRetry,
			maxRetryCount,
			pOnDropFile,
			pShapeUploadError,
			pOnFileUploadError,
			pOnFileUploaded,
		],
	)

	const onRemoveFile = useCallback(
		async (id: string) => {
			await pOnRemoveFile?.(id)
			dispatch({ type: 'remove', id })
		},
		[pOnRemoveFile],
	)

	const canRetry = useCallback(
		(id: string) => {
			const fileStatus = fileStatuses.find((file) => file.id === id)
			return (
				fileStatus?.status === 'error' &&
				fileStatus.tries < (maxRetryCount ?? Infinity)
			)
		},
		[fileStatuses, maxRetryCount],
	)

	const onRetry = useCallback(
		async (id: string) => {
			if (!canRetry(id)) {
				return
			}
			dispatch({ type: 'update-status', id, status: 'pending' })
			const fileStatus = fileStatuses.find((file) => file.id === id)
			if (!fileStatus || fileStatus.status !== 'error') {
				return
			}
			await _uploadFile(fileStatus.file, id)
		},
		[canRetry, fileStatuses, _uploadFile],
	)

	const getFileMessageId = (id: string) => `${inputId}-${id}-message`

	const dropzone = rootUseDropzone({
		accept: validation?.accept,
		minSize: validation?.minSize,
		maxSize: validation?.maxSize,
		onDropAccepted: async (newFiles) => {
			setRootError(undefined)

			const maxFiles = validation?.maxFiles
			const remainingSlots =
				maxFiles === undefined
					? Infinity
					: Math.max(0, maxFiles - fileStatuses.length)

			if (remainingSlots < newFiles.length && shiftOnMaxFiles !== true) {
				setRootError(getRootError(['too-many-files'], validation ?? {}))
			}

			const slicedNewFiles =
				maxFiles === undefined
					? newFiles
					: shiftOnMaxFiles === true
						? newFiles.slice(0, maxFiles)
						: newFiles.slice(0, remainingSlots)

			if (shiftOnMaxFiles === true && maxFiles !== undefined) {
				const removeCount = Math.max(
					0,
					fileStatuses.length + slicedNewFiles.length - maxFiles,
				)
				if (removeCount > 0) {
					const filesToRemove = fileStatuses.slice(0, removeCount)
					await Promise.all(
						filesToRemove.map((fileStatus) => onRemoveFile(fileStatus.id)),
					)
				}
			}

			const onDropFilePromises = slicedNewFiles.map(async (file) => {
				const id = crypto.randomUUID()
				dispatch({ type: 'add', fileName: file.name, file, id })
				await _uploadFile(file, id)
			})

			await Promise.all(onDropFilePromises)
			if (pOnAllUploaded !== undefined) {
				pOnAllUploaded()
			}
		},
		onDropRejected: (fileRejections) => {
			const errorMessage = getRootError(
				getDropZoneErrorCodes(fileRejections),
				validation ?? {},
			)
			setRootError(errorMessage)
		},
	})

	return {
		getRootProps: dropzone.getRootProps,
		getInputProps: dropzone.getInputProps,
		inputId,
		rootMessageId,
		rootDescriptionId,
		getFileMessageId,
		onRemoveFile,
		onRetry,
		canRetry,
		fileStatuses,
		isInvalid,
		rootError,
		isDragActive: dropzone.isDragActive,
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DropZoneContext = createContext<UseDropzoneReturn<any, any>>({
	getRootProps: () => ({}) as never,
	getInputProps: () => ({}) as never,
	onRemoveFile: async () => {},
	onRetry: async () => {},
	canRetry: () => false,
	fileStatuses: [],
	isInvalid: false,
	isDragActive: false,
	rootError: undefined,
	inputId: '',
	rootMessageId: '',
	rootDescriptionId: '',
	getFileMessageId: () => '',
})

const useDropzoneContext = <TUploadRes, TUploadError>() => {
	return useContext(DropZoneContext) as UseDropzoneReturn<
		TUploadRes,
		TUploadError
	>
}

interface DropzoneProps<TUploadRes, TUploadError>
	extends UseDropzoneReturn<TUploadRes, TUploadError> {
	children: React.ReactNode
}

const Dropzone = <TUploadRes, TUploadError>(
	props: DropzoneProps<TUploadRes, TUploadError>,
) => {
	const { children, ...rest } = props
	return (
		<DropZoneContext.Provider value={rest}>{children}</DropZoneContext.Provider>
	)
}
Dropzone.displayName = 'Dropzone'

interface DropZoneAreaProps extends React.HTMLAttributes<HTMLDivElement> {}

const DropZoneArea = forwardRef<HTMLDivElement, DropZoneAreaProps>(
	({ className, children, ...props }, forwardedRef) => {
		const context = useDropzoneContext()

		if (!context) {
			throw new Error('DropzoneArea must be used within a Dropzone')
		}

		const { onFocus, onBlur, onDragEnter, onDragLeave, onDrop, ref } =
			context.getRootProps()

		return (
			// A11y behavior is handled through Trigger. All of these are only relevant to drag and drop which means this should be fine?
			// eslint-disable-next-line jsx-a11y/no-static-element-interactions
			<div
				ref={(instance) => {
					// TODO: test if this actually works?
					ref.current = instance
					if (typeof forwardedRef === 'function') {
						forwardedRef(instance)
					} else if (forwardedRef) {
						forwardedRef.current = instance
					}
				}}
				onFocus={onFocus}
				onBlur={onBlur}
				onDragEnter={onDragEnter}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
				{...props}
				aria-label='dropzone'
				className={cn(
					'flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
					context.isDragActive && 'animate-pulse bg-black/5',
					context.isInvalid && 'border-destructive',
					className,
				)}
			>
				{children}
			</div>
		)
	},
)
DropZoneArea.displayName = 'DropZoneArea'

export interface DropzoneDescriptionProps
	extends React.HTMLAttributes<HTMLParagraphElement> {}

const DropzoneDescription = forwardRef<
	HTMLParagraphElement,
	DropzoneDescriptionProps
>(({ className, ...props }, ref) => {
	const context = useDropzoneContext()
	if (!context) {
		throw new Error('DropzoneDescription must be used within a Dropzone')
	}

	return (
		<p
			ref={ref}
			id={context.rootDescriptionId}
			{...props}
			className={cn('pb-1 text-muted-foreground text-sm', className)}
		/>
	)
})
DropzoneDescription.displayName = 'DropzoneDescription'

interface DropzoneFileListContext<TUploadRes, TUploadError> {
	onRemoveFile: () => Promise<void>
	onRetry: () => Promise<void>
	fileStatus: FileStatus<TUploadRes, TUploadError>
	canRetry: boolean
	dropzoneId: string
	messageId: string
}

const DropzoneFileListContext = createContext<
	DropzoneFileListContext<unknown, unknown>
>({
	onRemoveFile: async () => {},
	onRetry: async () => {},
	fileStatus: {} as FileStatus<unknown, unknown>,
	canRetry: false,
	dropzoneId: '',
	messageId: '',
})

const useDropzoneFileListContext = () => {
	return useContext(DropzoneFileListContext)
}

interface DropZoneFileListProps
	extends React.OlHTMLAttributes<HTMLOListElement> {}

const DropzoneFileList = forwardRef<HTMLOListElement, DropZoneFileListProps>(
	({ className, children, ...props }, ref) => {
		const context = useDropzoneContext()
		if (!context) {
			throw new Error('DropzoneFileList must be used within a Dropzone')
		}
		return (
			<ol
				ref={ref}
				aria-label='dropzone-file-list'
				{...props}
				className={cn('flex flex-col gap-4', className)}
			>
				{children}
			</ol>
		)
	},
)
DropzoneFileList.displayName = 'DropzoneFileList'

interface DropzoneFileListItemProps<TUploadRes, TUploadError>
	extends React.LiHTMLAttributes<HTMLLIElement> {
	file: FileStatus<TUploadRes, TUploadError>
}

const DropzoneFileListItem = forwardRef<
	HTMLLIElement,
	DropzoneFileListItemProps<unknown, unknown>
>(({ className, file, children, ...props }, ref) => {
	const fileId = file.id
	const {
		onRemoveFile: cOnRemoveFile,
		onRetry: cOnRetry,
		getFileMessageId: cGetFileMessageId,
		canRetry: cCanRetry,
		inputId: cInputId,
	} = useDropzoneContext()

	const onRemoveFile = useCallback(
		() => cOnRemoveFile(fileId),
		[fileId, cOnRemoveFile],
	)
	const onRetry = useCallback(() => cOnRetry(fileId), [fileId, cOnRetry])
	const messageId = cGetFileMessageId(fileId)
	const isInvalid = file.status === 'error'
	const canRetry = useMemo(() => cCanRetry(fileId), [fileId, cCanRetry])
	return (
		<DropzoneFileListContext.Provider
			value={{
				onRemoveFile,
				onRetry,
				fileStatus: file,
				canRetry,
				dropzoneId: cInputId,
				messageId,
			}}
		>
			<li
				ref={ref}
				aria-label='dropzone-file-list-item'
				aria-describedby={isInvalid ? messageId : undefined}
				{...props}
				className={cn(
					'flex flex-col justify-center gap-2 rounded-md bg-muted/40 px-4 py-2',
					className,
				)}
			>
				{children}
			</li>
		</DropzoneFileListContext.Provider>
	)
})
DropzoneFileListItem.displayName = 'DropzoneFileListItem'

interface DropzoneFileMessageProps
	extends React.HTMLAttributes<HTMLParagraphElement> {}

const DropzoneFileMessage = forwardRef<
	HTMLParagraphElement,
	DropzoneFileMessageProps
>(({ className, children, ...props }, ref) => {
	const context = useDropzoneFileListContext()
	if (!context) {
		throw new Error(
			'DropzoneFileMessage must be used within a DropzoneFileListItem',
		)
	}

	const body =
		context.fileStatus.status === 'error'
			? String(context.fileStatus.error)
			: children
	return (
		<p
			ref={ref}
			id={context.messageId}
			{...props}
			className={cn(
				'h-5 font-medium text-[0.8rem] text-destructive',
				className,
			)}
		>
			{body}
		</p>
	)
})
DropzoneFileMessage.displayName = 'DropzoneFileMessage'

interface DropzoneMessageProps
	extends React.HTMLAttributes<HTMLParagraphElement> {}

const DropzoneMessage = forwardRef<HTMLParagraphElement, DropzoneMessageProps>(
	({ className, children, ...props }, ref) => {
		const context = useDropzoneContext()
		if (!context) {
			throw new Error('DropzoneRootMessage must be used within a Dropzone')
		}

		const body = context.rootError ? String(context.rootError) : children
		return (
			<p
				ref={ref}
				id={context.rootMessageId}
				{...props}
				className={cn(
					'h-5 font-medium text-[0.8rem] text-destructive',
					className,
				)}
			>
				{body}
			</p>
		)
	},
)
DropzoneMessage.displayName = 'DropzoneMessage'

type DropzoneRemoveFileProps = ButtonProps & {}

const DropzoneRemoveFile = forwardRef<
	HTMLButtonElement,
	DropzoneRemoveFileProps
>(({ className, children, ...props }, ref) => {
	const context = useDropzoneFileListContext()
	if (!context) {
		throw new Error(
			'DropzoneRemoveFile must be used within a DropzoneFileListItem',
		)
	}
	return (
		<Button
			ref={ref}
			onClick={context.onRemoveFile}
			type='button'
			size='icon'
			{...props}
			className={cn(
				'aria-disabled:pointer-events-none aria-disabled:opacity-50',
				className,
			)}
		>
			{children}
			<span className='sr-only'>Remove file</span>
		</Button>
	)
})
DropzoneRemoveFile.displayName = 'DropzoneRemoveFile'

type DropzoneRetryFileProps = ButtonProps & {}

const DropzoneRetryFile = forwardRef<HTMLButtonElement, DropzoneRetryFileProps>(
	({ className, children, ...props }, ref) => {
		const context = useDropzoneFileListContext()

		if (!context) {
			throw new Error(
				'DropzoneRetryFile must be used within a DropzoneFileListItem',
			)
		}

		const canRetry = context.canRetry

		return (
			<Button
				ref={ref}
				aria-disabled={!canRetry}
				aria-label='retry'
				onClick={context.onRetry}
				type='button'
				size='icon'
				{...props}
				className={cn(
					'aria-disabled:pointer-events-none aria-disabled:opacity-50',
					className,
				)}
			>
				{children}
				<span className='sr-only'>Retry</span>
			</Button>
		)
	},
)
DropzoneRetryFile.displayName = 'DropzoneRetryFile'

interface DropzoneTriggerProps
	extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const DropzoneTrigger = forwardRef<HTMLLabelElement, DropzoneTriggerProps>(
	({ className, children, ...props }, ref) => {
		const context = useDropzoneContext()
		if (!context) {
			throw new Error('DropzoneTrigger must be used within a Dropzone')
		}

		const { fileStatuses, getFileMessageId } = context

		const fileMessageIds = useMemo(
			() =>
				fileStatuses
					.filter((file) => file.status === 'error')
					.map((file) => getFileMessageId(file.id)),
			[fileStatuses, getFileMessageId],
		)

		return (
			<label
				ref={ref}
				{...props}
				className={cn(
					'cursor-pointer rounded-sm bg-secondary px-4 py-2 font-medium ring-offset-background transition-colors focus-within:outline-none hover:bg-secondary/80 has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring has-[input:focus-visible]:ring-offset-2',
					className,
				)}
			>
				{children}
				<input
					{...context.getInputProps({
						style: {
							display: undefined,
						},
						className: 'sr-only',
						tabIndex: undefined,
					})}
					aria-describedby={
						context.isInvalid
							? [context.rootMessageId, ...fileMessageIds].join(' ')
							: undefined
					}
					aria-invalid={context.isInvalid}
				/>
			</label>
		)
	},
)
DropzoneTrigger.displayName = 'DropzoneTrigger'

interface InfiniteProgressProps extends React.HTMLAttributes<HTMLDivElement> {
	status: 'pending' | 'success' | 'error'
}

const valueTextMap = {
	pending: 'indeterminate',
	success: '100%',
	error: 'error',
}

const InfiniteProgress = forwardRef<HTMLDivElement, InfiniteProgressProps>(
	({ className, status, ...props }, ref) => {
		const done = status === 'success' || status === 'error'
		const error = status === 'error'
		return (
			<div
				ref={ref}
				role='progressbar'
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuetext={valueTextMap[status]}
				{...props}
				className={cn(
					'relative h-2 w-full overflow-hidden rounded-full bg-muted',
					className,
				)}
			>
				<div
					// TODO: add proper done transition
					className={cn(
						'h-full w-full rounded-full bg-primary',
						done ? 'translate-x-0' : 'animate-infinite-progress',
						error && 'bg-destructive',
					)}
				/>
			</div>
		)
	},
)
InfiniteProgress.displayName = 'InfiniteProgress'

export {
	DropZoneArea,
	Dropzone,
	DropzoneDescription,
	DropzoneFileList,
	DropzoneFileListItem,
	DropzoneFileMessage,
	DropzoneMessage,
	DropzoneRemoveFile,
	DropzoneRetryFile,
	DropzoneTrigger,
	InfiniteProgress,
	useDropzone,
}
