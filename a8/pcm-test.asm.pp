    icl 'hardware.asm'

    org $80
index org *+1
vars
wavei org *+1
finelevels org *+1
offset org *+1
pulseperiod org *+1
pulsediff org *+1
varcount equ *-vars
gy org *+1
keyrepeat org *+1
keyrepeat_count_first org *+1
keyrepeat_count_again org *+1
rem org *+1
d org *+1
lastkey org *+1
editptr org *+2
editdelta org *+1
editoffset org *+1

    org $2000
min_finelevel equ 4
max_finelevel equ 16
finelevelscount equ max_finelevel-min_finelevel+1
audc_tables
>>> for $finelevels (4 .. 16) {
>>>   $range = $finelevels * 16;
>>>   $pad = (256-$range) / 2;
>>>   $adjust = 16-$finelevels;
lo<<<$range>>>
    ert <*!=0
>>>   if ($pad) {
    :<<<$pad>>> dta $A0
>>>   }
    :<<<$range>>> dta $A0|[[#+1+<<<$adjust>>>*[#/<<<$finelevels>>>]]&$F]
>>>   if ($pad) {
    :<<<$pad>>> dta $AF
>>>   }
hi<<<$range>>>
    ert <*!=0
>>>   if ($pad) {
    :<<<$pad>>> dta $10
>>>   }
    :<<<$range>>> dta $10|[[#+1+<<<$adjust>>>*[#/<<<$finelevels>>>]]>>4]
>>>   if ($pad) {
    :<<<$pad>>> dta $1F
>>>   }
>>> }
    org [*+$FF]&$FF00
>>> for $period (qw(104 208 112 224 120 240 128 256 131 156)) {
wavetri<<<$period>>>
>>>   $pad = (256-$period/2)>>1;
>>>   for ($i = 0; $i < 256; ++$i) {
>>>     $im = $i%$period;
>>>     $s = $im<$period/2 ? $pad + $im : 256 - $pad - ($im - ($period>>1));
    dta <<<$s>>>
>>>   }
    org [*+$FF]&$FF00
wavesin<<<$period>>>
>>>   for ($i = 0; $i < 256; ++$i) {
>>>     $s = int(sin($i / ($period/2) * 3.141592654) * 63 + 128);
    dta <<<$s>>>
>>>   }
>>> }

    org [*+$FF]&$FF00
wavelo
    dta <wavetri104,<wavetri208,<wavetri112,<wavetri224,<wavetri128,<wavetri256
    dta <wavetri131,<wavetri156
    dta <wavesin104,<wavesin208,<wavesin112,<wavesin224,<wavesin128,<wavesin256
    dta <wavesin131,<wavesin156
wavecount equ *-wavelo
wavehi
    dta >wavetri104,>wavetri208,>wavetri112,>wavetri224,>wavetri128,>wavetri256
    dta >wavetri131,>wavetri156
    dta >wavesin104,>wavesin208,>wavesin112,>wavesin224,>wavesin128,>wavesin256
    dta >wavesin131,>wavesin156
waveend
    :2 dta 207,207,16*14-1,16*14-1,$FF,$FF,130,155
keyrepeattbl
    :2 dta 14,14,11,11,9,9,19,16

dlist
    :3 dta $70
    dta $47,a(scr)
    :11 dta $7
    dta $41,a(dlist)
scr
scr_wave equ *+12
    dta d'  waveform: tri     '
scr_finelevels equ *+12
    dta d'finelevels: 14      '
scr_offset equ *+12
    dta d'    offset: 0       '
scr_pulse equ *+12
    dta d'     pulse: 003/005 '
scr_pulsediff equ *+12
    dta d' pulsediff: 02      '
    dta d' w/s - up/down      '
    dta d' a/d - change option'
    dta d' any key - reset    '
    dta d'                    '
scr_editoffset equ *+6
scr_editvalue equ *+17
    dta d'edit:     value:    '
    dta d' i/k - up/down      '
    dta d' j/l - left/right   '
leftmark
    dta d'    >    '*
rightmark
    dta d'    <    '*
wavestr
    dta d'TRI104  TRI208  TRI112  TRI224  TRI128  TRI256  TRI131  TRI156  '*
    dta d'SIN104  SIN208  SIN112  SIN224  SIN128  SIN256  SIN131  SIN156  '*
finelevelsstr
    dta d'13141516'*
digits
    dta d'0123456789ABCDEF'*
delay
    dta 8

main
    sei
    mva #0 NMIEN
    sta DMACTL
    sta AUDCTL
    mva #$08 COLPM0 ; channel 1
    mva #$FF GRAFP0
    mva #$04 PRIOR
    mva #0 wavei
    mva #3 pulseperiod
    mva #2 pulsediff
    mva #4 lastkey
    mva #14-min_finelevel finelevels
    lda #0
    sta offset
    sta editoffset
    sta gy

    lda:rne VCOUNT
    mwa #dlist DLISTL
    mva #$22 DMACTL

reset
    jsr draw_menu

    ldx wavei
    mva waveend,x cmpindex+1
    mva keyrepeattbl,x keyrepeat_count_first
    lsr @
    sta keyrepeat_count_again
    mva wavelo,x ldwave+1
    sta editptr
    mva wavehi,x ldwave+2
    sta editptr+1
    lda finelevels
    asl @
    add >audc_tables
    sta ldlo+2
    adc #1
    sta ldhi+2
    mva #0 ldlo+1
    sta ldhi+1
    mva offset index

    lda:req VCOUNT
    jmp start

    org [*+$FF]&$FF00
start
    inc WSYNC
    lda VCOUNT
    bne start
    jsr setpulse

    ldy index ; 3 cycles
play
ldwave
    ldx $FFFF,y
ldhi
    lda $FFFF,x ; 4 cycles
ldlo
    ldy $FFFF,x ; 4 cycles
    inc WSYNC ; Guarantee next instruction starts on cycle 105
    sta AUDC3 ; 4 cycles
    sty AUDC1
    stx HPOSP0 ; 4 cycles
    ldy index
cmpindex
    cpy #$FF
    beq loop
cont
    iny
    sty index
    lda SKSTAT
    and #4
    cmp:sta lastkey
    bcs play
    jmp keydown
loop
    mvy #0 index
    dec keyrepeat
    beq virtualkeyup
    jmp play

; -------v--------v--------v-----d------------vr-------vr----u---v-------v

virtualkeyup
    mva #4 lastkey
    jmp play
keydown
    lda keyrepeat_count_first
    ldy index
    cpy #1
    sne:lda keyrepeat_count_again
    sta keyrepeat
    mva #0 editdelta
    ldy editoffset
    ldx gy
    lda KBCODE
    cmp #46 ; 'W'
    sne:dex
    cmp #62 ; 'S'
    sne:inx
    cmp #63 ; 'A'
    sne:dec vars,x
    cmp #58 ; 'D'
    sne:inc vars,x
    cmp #13 ; 'I'
    sne:inc editdelta
    cmp #5  ; 'K'
    sne:dec editdelta
    cmp #1  ; 'J'
    sne:dey
    cmp #0  ; 'L'
    sne:iny
    txa ; set N flag per X register
    spl:ldx #varcount-1
    cpx #varcount
    scc:ldx #0
    stx gy
    lda editdelta
    add:sta (editptr),y
    sty editoffset
    jmp reset

draw_menu
    ; wavei
    ; -----
    lda wavei
    spl:lda #wavecount-1
    cmp #wavecount
    scc:lda #0
    sta wavei
    :3 asl @
    add #7
    tax
    ldy #7
    mva:rpl wavestr,x- scr_wave,y-
    ; finelevels
    ; -----
    lda finelevels
    spl:lda #finelevelscount-1
    cmp #finelevelscount
    scc:lda #0
    sta finelevels
    add #min_finelevel
    ldx #10
    jsr div
    mvy digits,x scr_finelevels
    tax
    mvy digits,x scr_finelevels+1
    ; offset
    ; ------
    lda offset
    ldx #100
    jsr div
    mvy digits,x scr_offset
    ldx #10
    jsr div
    mvy digits,x scr_offset+1
    tax
    mvy digits,x scr_offset+2
    ; editoffset
    ; -----------
    lda editoffset
    ldx #100
    jsr div
    mvy digits,x scr_editoffset
    ldx #10
    jsr div
    mvy digits,x scr_editoffset+1
    tax
    mvy digits,x scr_editoffset+2
    ; editvalue
    ; -----------
    ldy editoffset
    lda (editptr),y
    ldx #16
    jsr div
    mvy digits,x scr_editvalue
    tax
    mvy digits,x scr_editvalue+1
    ; pulseperiod
    ; ------
    lda pulseperiod
    ldx #100
    jsr div
    mvy digits,x scr_pulse
    ldx #10
    jsr div
    mvy digits,x scr_pulse+1
    tax
    mvy digits,x scr_pulse+2
    lda pulseperiod
    add pulsediff
    ldx #100
    jsr div
    mvy digits,x scr_pulse+4
    ldx #10
    jsr div
    mvy digits,x scr_pulse+5
    tax
    mvy digits,x scr_pulse+6
    ; pulsediff
    ; ------
    lda pulsediff
    ldx #100
    jsr div
    mvy digits,x scr_pulsediff
    ldx #10
    jsr div
    mvy digits,x scr_pulsediff+1
    tax
    mvy digits,x scr_pulsediff+2
    ; mark
    ; ----
    ldx gy
    mva leftmark+4,x scr_wave-1
    mva rightmark+4,x scr_wave+7
    mva leftmark+3,x scr_finelevels-1
    mva rightmark+3,x scr_finelevels+7
    mva leftmark+2,x scr_offset-1
    mva rightmark+2,x scr_offset+7
    mva leftmark+1,x scr_pulse-1
    mva rightmark+1,x scr_pulse+7
    mva leftmark,x scr_pulsediff-1
    mva rightmark,x scr_pulsediff+7
    rts

div
    stx d
    ldx #$FF
    sec
divloop
    inx
    sta rem
    sbc d
    bcs divloop
divdone
    lda rem
    rts

setpulse
    ; 1.79Mhz for channel 1
FAST1 equ 1<<6
    ; 1.79Mhz for channel 3
FAST3 equ 1<<5
    ; HiPass 1+3
HI13 equ 1<<2
    ; 15Khz
KHZ15 equ 1<<0
    mva #0 SKCTL
    ; Optimal delay for minimizing pops for finelevels=14, pulse=3/5 upon
    ; Altirra XEX boot, but not guaranteed after first user input
    ;:18 inc WSYNC
    :4 inc WSYNC
    mva #3 SKCTL
    mva #[FAST1|FAST3|HI13] AUDCTL
    ; Set up 1/16 dutycycle HiPass on 1+3
    ldx pulseperiod
    txa
    add pulsediff
    stx AUDF1
    sta AUDF3
    sta STIMER
    stx AUDF3
    ;ldx delay
    ;dex:rne
    rts

    run main
