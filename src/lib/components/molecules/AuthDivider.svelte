<script lang="ts">
	// Componentes
	import { Separator } from '$lib/components/atoms/separator';

	/** La raya entre "con Google" y el formulario de siempre. */
	interface Props {
		label?: string;
	}

	let { label = 'o con tu correo' }: Props = $props();
</script>

<div class="flex items-center gap-3">
	<Separator class="flex-1" />
	<span class="text-muted-foreground text-xs">{label}</span>
	<Separator class="flex-1" />
</div>
